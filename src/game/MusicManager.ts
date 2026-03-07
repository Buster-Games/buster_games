import Phaser from 'phaser';

/**
 * All available music tracks, keyed by a logical name.
 */
const TRACKS: Record<string, string> = {
  menu:        'audio/music/menu.mp3',
  'asier-lara': 'audio/music/asier-lara.mp3',
  'nic-game':  'audio/music/nic-game.mp3',
  'anna-collin': 'audio/music/ann-collin.mp3',
  'rita-andre': 'audio/music/rita-andre.mp3',
  'game-2':    'audio/music/game-2.mp3',
};

/** Maps campaign step IDs to music track keys. */
const CAMPAIGN_MUSIC: Record<string, string | null> = {
  'intro':           'asier-lara',
  'asier-match':     'asier-lara',
  'nic-steals':      'nic-game',
  'anna-collin-intro': 'ann-collin',
  'anna-collin-match': 'ann-collin',
  'andre-rita-intro': 'rita-andre',
  'andre-rita-match': 'rita-andre',
  'nic-boss-intro':  'nic-game',
  'nic-match-set1':  'nic-game',
  'nic-mid-match':   'nic-game',
  'girls-cheer':     'nic-game',
  'nic-match-final': 'nic-game',
  'reunion':         'game-2',
  'finale-tennis':   'game-2',
  'finale-match':    'game-2',
  'love-message':    null,          // silence
};

/** Normal playback volume and the ducked volume during cutscenes. */
const FULL_VOLUME = 0.6;
const DUCKED_VOLUME = 0.25;
const FADE_MS = 800;

/**
 * MusicManager — Singleton that survives across Phaser scenes.
 *
 * Only the menu track is loaded eagerly (in HomeScene's preload).
 * All other tracks are loaded on-demand when first requested,
 * keeping the initial load under ~7 MB instead of ~37 MB.
 */
export class MusicManager {
  private static currentKey: string | null = null;
  private static currentSound: Phaser.Sound.BaseSound | null = null;
  private static menuLoaded = false;

  /** Preload only the menu track — called in HomeScene's preload(). */
  static preload(scene: Phaser.Scene): void {
    if (MusicManager.menuLoaded) return;
    if (!scene.cache.audio.exists('menu')) {
      scene.load.audio('menu', TRACKS['menu']);
    }
    MusicManager.menuLoaded = true;
  }

  /** Start playing a track (or do nothing if it's already playing). */
  static play(key: string | null, scene: Phaser.Scene): void {
    // null = silence
    if (key === null) {
      MusicManager.stop(scene);
      return;
    }

    // Already playing this track
    if (MusicManager.currentKey === key && MusicManager.currentSound) return;

    const path = TRACKS[key];
    if (!path) return; // unknown track

    // If the audio isn't cached yet, load it on-demand then play
    if (!scene.cache.audio.exists(key)) {
      // Stop old track immediately while we load the new one
      if (MusicManager.currentSound) {
        MusicManager.currentSound.stop();
        MusicManager.currentSound.destroy();
        MusicManager.currentSound = null;
      }
      MusicManager.currentKey = null;

      scene.load.audio(key, path);
      scene.load.once('complete', () => {
        MusicManager._startTrack(key, scene);
      });
      scene.load.start();
      return;
    }

    // Audio is already cached — play immediately
    // Stop old track first
    if (MusicManager.currentSound) {
      MusicManager.currentSound.stop();
      MusicManager.currentSound.destroy();
    }

    MusicManager._startTrack(key, scene);
  }

  /** Internal: create and fade-in a sound that's already in cache. */
  private static _startTrack(key: string, scene: Phaser.Scene): void {
    const sound = scene.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    scene.tweens.add({
      targets: sound,
      volume: FULL_VOLUME,
      duration: FADE_MS,
    });

    MusicManager.currentKey = key;
    MusicManager.currentSound = sound;
  }

  /** Fade the current track to a lower volume (cutscene ducking). */
  static duck(scene: Phaser.Scene): void {
    if (!MusicManager.currentSound || !('volume' in MusicManager.currentSound)) return;
    scene.tweens.add({
      targets: MusicManager.currentSound,
      volume: DUCKED_VOLUME,
      duration: FADE_MS,
    });
  }

  /** Restore the current track to full volume. */
  static unduck(scene: Phaser.Scene): void {
    if (!MusicManager.currentSound || !('volume' in MusicManager.currentSound)) return;
    scene.tweens.add({
      targets: MusicManager.currentSound,
      volume: FULL_VOLUME,
      duration: FADE_MS,
    });
  }

  /** Fade out and silence. */
  static stop(scene: Phaser.Scene): void {
    if (!MusicManager.currentSound) {
      MusicManager.currentKey = null;
      return;
    }
    // Stop immediately to avoid orphaned sounds across scene transitions.
    MusicManager.currentSound.stop();
    MusicManager.currentSound.destroy();
    MusicManager.currentSound = null;
    MusicManager.currentKey = null;
  }

  /** Convenience: play the right track for a campaign step ID. */
  static playForStep(stepId: string, scene: Phaser.Scene): void {
    const key = CAMPAIGN_MUSIC[stepId] ?? null;
    if (key === undefined) return; // unknown step — don't change music
    MusicManager.play(key, scene);
  }

  /** Play a random non-menu track — used by QuickMatchScene. */
  static playRandom(scene: Phaser.Scene): void {
    const keys = Object.keys(TRACKS).filter(k => k !== 'menu');
    const pick = keys[Math.floor(Math.random() * keys.length)];
    MusicManager.play(pick, scene);
  }

  /** Expose campaign music map for testing. */
  static get campaignMusicMap(): Record<string, string | null> {
    return CAMPAIGN_MUSIC;
  }

  /** Expose track registry for testing. */
  static get trackRegistry(): Record<string, string> {
    return TRACKS;
  }
}
