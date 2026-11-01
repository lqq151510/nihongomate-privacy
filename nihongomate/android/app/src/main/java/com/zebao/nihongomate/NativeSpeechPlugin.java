package com.zebao.nihongomate;

import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Consumer;

/** Device speech only; never changes system engine settings or installs voice data. */
@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {
    private static final String GOOGLE_ENGINE = "com.google.android.tts";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<InitWaiter> initWaiters = new ArrayList<>();
    private TextToSpeech tts;
    private boolean googleEngineRequested;
    private boolean initialized;
    private boolean initializing;
    private boolean destroyed;
    private int initGeneration;
    private long utteranceSequence;
    private Runnable initTimeout;
    private Pending pending;

    private static class InitWaiter {
        final Runnable success;
        final Consumer<String> failure;
        InitWaiter(Runnable success, Consumer<String> failure) {
            this.success = success;
            this.failure = failure;
        }
    }

    private static class Pending {
        final PluginCall call;
        final String requestId;
        final String utteranceId;
        InitWaiter waiter;
        Runnable timeout;
        boolean settled;
        Pending(PluginCall call, String requestId, String utteranceId) {
            this.call = call;
            this.requestId = requestId;
            this.utteranceId = utteranceId;
        }
    }

    private InitWaiter ensureInitialized(Runnable success, Consumer<String> failure) {
        if (destroyed) { failure.accept("CANCELLED"); return null; }
        if (initialized) { success.run(); return null; }
        if (initWaiters.size() >= 32) { failure.accept("INIT_FAILED"); return null; }
        InitWaiter waiter = new InitWaiter(success, failure);
        initWaiters.add(waiter);
        if (initializing) return waiter;
        initializing = true;
        final int generation = ++initGeneration;
        initTimeout = () -> failInitialization(generation, "TIMEOUT");
        main.postDelayed(initTimeout, 8000);
        try {
            Intent service = new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE);
            List<ResolveInfo> services = getContext().getPackageManager().queryIntentServices(service, 0);
            boolean available = false;
            googleEngineRequested = false;
            for (ResolveInfo candidate : services) {
                if (candidate.serviceInfo == null || !candidate.serviceInfo.enabled
                    || candidate.serviceInfo.applicationInfo == null || !candidate.serviceInfo.applicationInfo.enabled) continue;
                available = true;
                if (GOOGLE_ENGINE.equals(candidate.serviceInfo.packageName)) googleEngineRequested = true;
            }
            if (!available) {
                failInitialization(generation, "NO_ENGINE");
                return waiter;
            }
            // Always enqueue OnInit: some engines fail synchronously before this constructor returns.
            TextToSpeech.OnInitListener onInit = status -> main.post(() -> finishInitialization(generation, status));
            // A Google initialization failure settles normally; do not rebuild with a default engine.
            tts = googleEngineRequested
                ? new TextToSpeech(getContext().getApplicationContext(), onInit, GOOGLE_ENGINE)
                : new TextToSpeech(getContext().getApplicationContext(), onInit);
        } catch (RuntimeException error) {
            failInitialization(generation, "INIT_FAILED");
        }
        return waiter;
    }

    private void finishInitialization(int generation, int status) {
        if (destroyed || generation != initGeneration || !initializing) return;
        if (status != TextToSpeech.SUCCESS || tts == null) {
            failInitialization(generation, "INIT_FAILED");
            return;
        }
        try {
            int listenerStatus = tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { main.post(() -> finishUtterance(id, true, null)); }
                @Override public void onError(String id) { main.post(() -> finishUtterance(id, false, "OUTPUT")); }
                @Override public void onError(String id, int errorCode) {
                    String code = errorCode == TextToSpeech.ERROR_NETWORK_TIMEOUT ? "TIMEOUT"
                        : errorCode == TextToSpeech.ERROR_NOT_INSTALLED_YET ? "NO_JAPANESE_VOICE"
                        : errorCode == TextToSpeech.ERROR_INVALID_REQUEST ? "INVALID_REQUEST" : "OUTPUT";
                    main.post(() -> finishUtterance(id, false, code));
                }
                @Override public void onStop(String id, boolean interrupted) {
                    main.post(() -> finishUtterance(id, false, "CANCELLED"));
                }
            });
            if (listenerStatus != TextToSpeech.SUCCESS) {
                failInitialization(generation, "INIT_FAILED");
                return;
            }
            initializing = false;
            initialized = true;
            main.removeCallbacks(initTimeout);
            List<InitWaiter> ready = new ArrayList<>(initWaiters);
            initWaiters.clear();
            for (InitWaiter waiter : ready) waiter.success.run();
        } catch (RuntimeException error) {
            failInitialization(generation, "INIT_FAILED");
        }
    }

    private void failInitialization(int generation, String code) {
        if (generation != initGeneration) return;
        ++initGeneration;
        initializing = false;
        initialized = false;
        if (initTimeout != null) main.removeCallbacks(initTimeout);
        if (tts != null) {
            try { tts.shutdown(); } catch (RuntimeException ignored) {}
            tts = null;
        }
        List<InitWaiter> failed = new ArrayList<>(initWaiters);
        initWaiters.clear();
        for (InitWaiter waiter : failed) waiter.failure.accept(code);
    }

    private List<Voice> japaneseVoices(boolean localOnly) {
        List<Voice> voices = new ArrayList<>();
        Set<Voice> provided = tts.getVoices();
        if (provided == null) return voices;
        for (Voice voice : provided) {
            if (voice == null || voice.getLocale() == null || !"ja".equals(voice.getLocale().getLanguage())) continue;
            if (googleEngineRequested && !compatibleGoogleVoice(voice)) continue;
            Set<String> features = voice.getFeatures();
            if (features != null && features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            if (localOnly && !isLocal(voice)) continue;
            voices.add(voice);
        }
        voices.sort(Comparator.comparing(Voice::getName));
        return voices;
    }

    private boolean isLocal(Voice voice) {
        // Unknown capabilities fail closed; never pass an unverified voice to local-only speech.
        return voice.getFeatures() != null && !voice.isNetworkConnectionRequired();
    }

    private boolean compatibleGoogleVoice(Voice voice) {
        return voice != null && voice.getName() != null
            && voice.getName().toLowerCase(Locale.ROOT).startsWith("ja-jp-");
    }

    private String voiceId(Voice voice) {
        return googleEngineRequested ? "android:" + GOOGLE_ENGINE + ":" + voice.getName() : "android:" + voice.getName();
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        main.post(() -> ensureInitialized(() -> {
            try {
                JSArray list = new JSArray();
                Voice current = tts.getVoice();
                for (Voice voice : japaneseVoices(false)) {
                    JSObject item = new JSObject();
                    item.put("id", voiceId(voice));
                    item.put("name", googleEngineRequested && compatibleGoogleVoice(voice) ? "Google · " + voice.getName() : voice.getName());
                    item.put("lang", voice.getLocale().toLanguageTag());
                    item.put("localService", isLocal(voice));
                    item.put("installed", true);
                    item.put("default", current != null && voice.getName().equals(current.getName()));
                    list.put(item);
                }
                JSObject result = new JSObject();
                result.put("voices", list);
                call.resolve(result);
            } catch (RuntimeException error) { call.reject("Cannot list device voices", "OUTPUT"); }
        }, code -> call.reject("Cannot initialize device speech", code)));
    }

    @PluginMethod
    public void speak(PluginCall call) {
        main.post(() -> {
            String text = call.getString("text");
            String requestId = call.getString("requestId");
            String preferred = call.getString("voiceId", "");
            Double rate = call.getDouble("rate");
            Double pitch = call.getData().has("pitch") ? call.getDouble("pitch") : Double.valueOf(1.0);
            boolean localOnly = call.getBoolean("localOnly", true);
            if (text == null || text.trim().isEmpty() || text.length() > TextToSpeech.getMaxSpeechInputLength()
                || requestId == null || !requestId.matches("[A-Za-z0-9_-]{1,128}")
                || preferred.length() > 1024 || rate == null || !Double.isFinite(rate) || rate < 0.5 || rate > 1.5
                || pitch == null || !Double.isFinite(pitch) || pitch < 0.8 || pitch > 1.2) {
                call.reject("Invalid speech request", "INVALID_REQUEST");
                return;
            }
            cancelPending(null);
            Pending request = new Pending(call, requestId, "nihongomate-" + (++utteranceSequence));
            pending = request;
            request.waiter = ensureInitialized(() -> {
                if (request.settled || pending != request) return;
                try {
                    List<Voice> voices = japaneseVoices(localOnly);
                    if (voices.isEmpty()) {
                        settle(request, false, localOnly && !japaneseVoices(false).isEmpty() ? "NO_LOCAL_VOICE" : "NO_JAPANESE_VOICE");
                        return;
                    }
                    Voice current = tts.getVoice();
                    Voice selected = null;
                    for (Voice voice : voices) if (voiceId(voice).equals(preferred)) selected = voice;
                    if (selected == null && current != null) {
                        for (Voice voice : voices) if (voice.getName().equals(current.getName())) selected = voice;
                    }
                    if (selected == null) selected = voices.get(0);
                    // Never use setLanguage fallback: it can silently pick an online or another-language voice.
                    if (tts.setVoice(selected) != TextToSpeech.SUCCESS || tts.setSpeechRate(rate.floatValue()) != TextToSpeech.SUCCESS) {
                        settle(request, false, "OUTPUT");
                        return;
                    }
                    Voice actual = tts.getVoice();
                    if (actual == null || actual.getLocale() == null || !"ja".equals(actual.getLocale().getLanguage())
                        || (googleEngineRequested && !compatibleGoogleVoice(actual))
                        || (actual.getFeatures() != null && actual.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) {
                        settle(request, false, "NO_JAPANESE_VOICE");
                        return;
                    }
                    if (localOnly && !isLocal(actual)) { settle(request, false, "NO_LOCAL_VOICE"); return; }
                    if (!actual.getName().equals(selected.getName())) { settle(request, false, "OUTPUT"); return; }
                    if (tts.setPitch(pitch.floatValue()) != TextToSpeech.SUCCESS) {
                        settle(request, false, "OUTPUT");
                        return;
                    }
                    long budget = Math.max(15000, Math.min(300000, (long) Math.ceil(text.length() * 500.0 / rate) + 10000));
                    request.timeout = () -> {
                        if (pending != request || request.settled) return;
                        settle(request, false, "TIMEOUT");
                        stopEngine();
                    };
                    main.postDelayed(request.timeout, budget);
                    if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), request.utteranceId) != TextToSpeech.SUCCESS) {
                        settle(request, false, "OUTPUT");
                        stopEngine();
                    }
                } catch (RuntimeException error) {
                    settle(request, false, "OUTPUT");
                    stopEngine();
                }
            }, code -> settle(request, false, code));
        });
    }

    private void finishUtterance(String id, boolean played, String code) {
        if (pending != null && pending.utteranceId.equals(id)) settle(pending, played, code);
    }

    private void settle(Pending request, boolean played, String code) {
        if (request.settled) return;
        request.settled = true;
        if (pending == request) pending = null;
        if (request.timeout != null) main.removeCallbacks(request.timeout);
        if (request.waiter != null) initWaiters.remove(request.waiter);
        if (code != null && !"CANCELLED".equals(code)) {
            request.call.reject("Device speech did not complete", code);
        } else {
            JSObject result = new JSObject();
            result.put("played", played);
            result.put("cancelled", "CANCELLED".equals(code));
            request.call.resolve(result);
        }
    }

    private void stopEngine() {
        if (tts != null) try { tts.stop(); } catch (RuntimeException ignored) {}
    }

    private void cancelPending(String requestId) {
        if (pending != null && (requestId == null || pending.requestId.equals(requestId))) {
            settle(pending, false, "CANCELLED");
            stopEngine();
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            String requestId = call.getString("requestId");
            if (requestId == null || requestId.length() > 128) { call.reject("Missing requestId", "INVALID_REQUEST"); return; }
            // An old stop must never cancel a newer utterance which has already reached the main thread.
            cancelPending(requestId);
            call.resolve();
        });
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        main.post(() -> {
            try {
                Intent settings = new Intent("com.android.settings.TTS_SETTINGS");
                getActivity().startActivity(settings);
                call.resolve();
            } catch (RuntimeException error) { call.reject("No system speech settings entry", "SETTINGS_UNAVAILABLE"); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        main.post(() -> {
            destroyed = true;
            cancelPending(null);
            failInitialization(initGeneration, "CANCELLED");
        });
    }
}
