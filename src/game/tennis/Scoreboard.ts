import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../../constants';

/**
 * Tennis scoring: 0, 15, 30, 40, then game.
 * Deuce/Advantage rules apply at 40-40.
 */
const POINT_LABELS = ['0', '15', '30', '40'] as const;

export interface ScoreboardConfig {
  scene: Phaser.Scene;
  width: number;
  playerName?: string;
  opponentName?: string;
  gamesPerSet?: number; // Default: 3 for quick games
}

/**
 * Scoreboard — Tennis score tracking and display.
 *
 * Handles points, games, sets with proper tennis rules including
 * deuce, advantage, and tiebreaks.
 */
export class Scoreboard {
  private scene: Phaser.Scene;

  // Score state
  private playerPoints = 0; // 0-3 (maps to 0,15,30,40)
  private opponentPoints = 0;
  private playerGames = 0;
  private opponentGames = 0;
  private playerSets = 0;
  private opponentSets = 0;
  private currentSet = 1;
  private gamesPerSet: number;

  // Deuce tracking
  private isDeuce = false;
  private advantage: 'player' | 'opponent' | null = null;

  // UI elements
  private container: Phaser.GameObjects.Container;
  private pointsText!: Phaser.GameObjects.Text;
  private gamesText!: Phaser.GameObjects.Text;
  private setInfoText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private opponentNameText!: Phaser.GameObjects.Text;

  // Callbacks
  public onGameWon: ((winner: 'player' | 'opponent') => void) | null = null;
  public onSetWon: ((winner: 'player' | 'opponent') => void) | null = null;
  public onMatchWon: ((winner: 'player' | 'opponent') => void) | null = null;

  constructor(config: ScoreboardConfig) {
    this.scene = config.scene;
    this.gamesPerSet = config.gamesPerSet ?? 3;

    // Create container for all scoreboard elements
    this.container = this.scene.add.container(0, 50);
    this.container.setDepth(200);

    this._createUI(config);
  }

  /**
   * Award a point to the player.
   */
  scorePoint(winner: 'player' | 'opponent'): void {
    if (this.isDeuce) {
      this._handleDeucePoint(winner);
    } else {
      this._handleNormalPoint(winner);
    }

    this._updateDisplay();
  }

  /**
   * Reset for a new game.
   */
  resetGame(): void {
    this.playerPoints = 0;
    this.opponentPoints = 0;
    this.isDeuce = false;
    this.advantage = null;
    this._updateDisplay();
  }

  /**
   * Reset for a new set.
   */
  resetSet(): void {
    this.resetGame();
    this.playerGames = 0;
    this.opponentGames = 0;
    this._updateDisplay();
  }

  /**
   * Reset everything for a new match.
   */
  resetMatch(): void {
    this.resetSet();
    this.playerSets = 0;
    this.opponentSets = 0;
    this.currentSet = 1;
    this._updateDisplay();
  }

  /**
   * Get current score state.
   */
  getScore(): {
    playerPoints: number;
    opponentPoints: number;
    playerGames: number;
    opponentGames: number;
    playerSets: number;
    opponentSets: number;
  } {
    return {
      playerPoints: this.playerPoints,
      opponentPoints: this.opponentPoints,
      playerGames: this.playerGames,
      opponentGames: this.opponentGames,
      playerSets: this.playerSets,
      opponentSets: this.opponentSets,
    };
  }

  private _handleNormalPoint(winner: 'player' | 'opponent'): void {
    if (winner === 'player') {
      this.playerPoints++;
    } else {
      this.opponentPoints++;
    }

    // Check for deuce (both at 40)
    if (this.playerPoints === 3 && this.opponentPoints === 3) {
      this.isDeuce = true;
      return;
    }

    // Check for game win
    if (this.playerPoints >= 4) {
      this._winGame('player');
    } else if (this.opponentPoints >= 4) {
      this._winGame('opponent');
    }
  }

  private _handleDeucePoint(winner: 'player' | 'opponent'): void {
    if (this.advantage === null) {
      // No advantage yet
      this.advantage = winner;
    } else if (this.advantage === winner) {
      // Advantage holder wins the game
      this._winGame(winner);
    } else {
      // Advantage lost, back to deuce
      this.advantage = null;
    }
  }

  private _winGame(winner: 'player' | 'opponent'): void {
    if (winner === 'player') {
      this.playerGames++;
    } else {
      this.opponentGames++;
    }

    // Check for set win
    const winnerGames = winner === 'player' ? this.playerGames : this.opponentGames;
    const loserGames = winner === 'player' ? this.opponentGames : this.playerGames;

    if (winnerGames >= this.gamesPerSet && winnerGames - loserGames >= 2) {
      this._winSet(winner);
    } else {
      // Reset for next game
      this.resetGame();

      if (this.onGameWon) {
        this.onGameWon(winner);
      }
    }
  }

  private _winSet(winner: 'player' | 'opponent'): void {
    if (winner === 'player') {
      this.playerSets++;
    } else {
      this.opponentSets++;
    }

    // Check for match win (best of 3 sets)
    if (this.playerSets >= 2) {
      if (this.onMatchWon) {
        this.onMatchWon('player');
      }
    } else if (this.opponentSets >= 2) {
      if (this.onMatchWon) {
        this.onMatchWon('opponent');
      }
    } else {
      // Next set
      this.currentSet++;
      this.resetSet();

      if (this.onSetWon) {
        this.onSetWon(winner);
      }
    }
  }

  private _createUI(config: ScoreboardConfig): void {
    const { width } = config;

    // Semi-transparent background bar
    const scoreBg = this.scene.add.graphics();
    scoreBg.fillStyle(PALETTE.nearBlack, 0.8);
    scoreBg.fillRect(0, 0, width, 50);
    this.container.add(scoreBg);

    // Player name (left)
    this.playerNameText = this.scene.add.text(20, 10, config.playerName ?? 'LARA', {
      fontFamily: FONT,
      fontSize: '10px',
      color: PALETTE_HEX.cream,
    });
    this.container.add(this.playerNameText);

    // Opponent name (right)
    this.opponentNameText = this.scene.add
      .text(width - 20, 10, config.opponentName ?? 'OPPONENT', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.pink,
      })
      .setOrigin(1, 0);
    this.container.add(this.opponentNameText);

    // Points display (center)
    this.pointsText = this.scene.add
      .text(width / 2, 10, '0 - 0', {
        fontFamily: FONT,
        fontSize: '14px',
        color: PALETTE_HEX.gold,
      })
      .setOrigin(0.5, 0);
    this.container.add(this.pointsText);

    // Games display (below points)
    this.gamesText = this.scene.add
      .text(width / 2, 28, 'GAMES: 0 - 0', {
        fontFamily: FONT,
        fontSize: '8px',
        color: PALETTE_HEX.lightGrey,
      })
      .setOrigin(0.5, 0);
    this.container.add(this.gamesText);

    // Set info (far right of games)
    this.setInfoText = this.scene.add
      .text(width - 20, 28, 'SET 1', {
        fontFamily: FONT,
        fontSize: '8px',
        color: PALETTE_HEX.lightGrey,
      })
      .setOrigin(1, 0);
    this.container.add(this.setInfoText);
  }

  private _updateDisplay(): void {
    // Points display
    const playerPointLabel = this._getPointLabel('player');
    const opponentPointLabel = this._getPointLabel('opponent');
    this.pointsText.setText(`${playerPointLabel} - ${opponentPointLabel}`);

    // Games display
    this.gamesText.setText(`GAMES: ${this.playerGames} - ${this.opponentGames}`);

    // Set info
    this.setInfoText.setText(`SET ${this.currentSet} (${this.playerSets}-${this.opponentSets})`);
  }

  private _getPointLabel(who: 'player' | 'opponent'): string {
    const points = who === 'player' ? this.playerPoints : this.opponentPoints;

    if (this.isDeuce) {
      if (this.advantage === null) {
        return '40';
      } else if (this.advantage === who) {
        return 'AD';
      } else {
        return '40';
      }
    }

    return POINT_LABELS[Math.min(points, 3)];
  }

  /**
   * Destroy the scoreboard.
   */
  destroy(): void {
    this.container.destroy();
  }
}
