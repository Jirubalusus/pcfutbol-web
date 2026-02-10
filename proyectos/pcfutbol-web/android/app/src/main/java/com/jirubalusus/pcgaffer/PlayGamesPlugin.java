package com.jirubalusus.pcgaffer;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.Player;
import com.google.android.gms.games.PlayersClient;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private static final String TAG = "PlayGamesPlugin";

    @Override
    public void load() {
        super.load();
        // Initialize Play Games SDK
        PlayGamesSdk.initialize(getContext());
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        GamesSignInClient gamesSignInClient = PlayGames.getGamesSignInClient(activity);
        
        gamesSignInClient.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuthenticated = task.isSuccessful() && task.getResult().isAuthenticated();
            
            if (isAuthenticated) {
                // Already signed in, get player info
                getPlayerInfo(call);
            } else {
                // Need to sign in
                gamesSignInClient.signIn().addOnCompleteListener(signInTask -> {
                    if (signInTask.isSuccessful()) {
                        getPlayerInfo(call);
                    } else {
                        Log.e(TAG, "Sign in failed", signInTask.getException());
                        call.reject("Sign in failed: " + (signInTask.getException() != null ? 
                            signInTask.getException().getMessage() : "Unknown error"));
                    }
                });
            }
        });
    }

    private void getPlayerInfo(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        PlayersClient playersClient = PlayGames.getPlayersClient(activity);
        playersClient.getCurrentPlayer().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                Player player = task.getResult();
                JSObject result = new JSObject();
                result.put("isSignedIn", true);
                
                JSObject playerObj = new JSObject();
                playerObj.put("playerId", player.getPlayerId());
                playerObj.put("displayName", player.getDisplayName());
                playerObj.put("iconImageUrl", player.getIconImageUrl());
                playerObj.put("hiResImageUrl", player.getHiResImageUrl());
                playerObj.put("title", player.getTitle());
                
                result.put("player", playerObj);
                call.resolve(result);
            } else {
                Log.e(TAG, "Failed to get player info", task.getException());
                call.reject("Failed to get player info");
            }
        });
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        // Play Games v2 doesn't have explicit sign out
        // The user needs to go to Play Games app settings
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isSignedIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            JSObject result = new JSObject();
            result.put("isSignedIn", false);
            call.resolve(result);
            return;
        }

        GamesSignInClient gamesSignInClient = PlayGames.getGamesSignInClient(activity);
        gamesSignInClient.isAuthenticated().addOnCompleteListener(task -> {
            JSObject result = new JSObject();
            result.put("isSignedIn", task.isSuccessful() && task.getResult().isAuthenticated());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getCurrentPlayer(PluginCall call) {
        getPlayerInfo(call);
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        PlayGames.getAchievementsClient(activity)
            .getAchievementsIntent()
            .addOnSuccessListener(intent -> {
                activity.startActivityForResult(intent, 9001);
                call.resolve();
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to show achievements: " + e.getMessage());
            });
    }

    @PluginMethod
    public void showLeaderboards(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        PlayGames.getLeaderboardsClient(activity)
            .getAllLeaderboardsIntent()
            .addOnSuccessListener(intent -> {
                activity.startActivityForResult(intent, 9002);
                call.resolve();
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to show leaderboards: " + e.getMessage());
            });
    }

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId");
        if (achievementId == null) {
            call.reject("achievementId is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        PlayGames.getAchievementsClient(activity).unlock(achievementId);
        call.resolve();
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        Integer score = call.getInt("score");
        
        if (leaderboardId == null || score == null) {
            call.reject("leaderboardId and score are required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        PlayGames.getLeaderboardsClient(activity).submitScore(leaderboardId, score);
        call.resolve();
    }
}
