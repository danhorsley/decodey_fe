import React from "react";
import { useNavigate } from "react-router-dom";
import useSettingsStore from "../stores/settingsStore";
import "../Styles/About.css";
import "../Styles/Privacy.css"; // Reusing Privacy.css styles
import "../Styles/Scoring.css"; // Import specific styles for scoring page

const Scoring = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);

  return (
    <div className="about-overlay">
      <div
        className={`about-container privacy-container ${
          settings.theme === "dark" ? "dark-theme" : ""
        }`}
      >
        <button
          className="about-close"
          onClick={() => navigate("/")}
          aria-label="Close scoring explanation"
        >
          &times;
        </button>

        <h2>Scoring System</h2>

        <section className="privacy-section">
          <h3>Base Formula</h3>
          <p>
            Your score in Uncrypt is calculated using a formula that takes into
            account:
          </p>
          <ul>
            <li>The difficulty level you've selected</li>
            <li>
              Whether you played in hardcore mode (no spaces or punctuation)
            </li>
            <li>The number of mistakes you made during the game</li>
            <li>The time you took to solve the puzzle</li>
          </ul>
          <p>The base formula is:</p>
          <div className="code-block">
            Score = 1000 × Difficulty Multiplier × Hardcore Multiplier × Mistake
            Factor × Time Factor
          </div>
        </section>

        <section className="privacy-section">
          <h3>Difficulty Levels</h3>
          <p>
            Uncrypt offers three difficulty levels, each with a different number
            of allowed mistakes and a corresponding multiplier:
          </p>
          <ul>
            <li>
              <strong>Easy:</strong> 7 mistakes allowed, 1.0× multiplier
              (baseline)
            </li>
            <li>
              <strong>Medium:</strong> 4 mistakes allowed, 2.5× multiplier
            </li>
            <li>
              <strong>Hard:</strong> 2 mistakes allowed, 6.25× multiplier
            </li>
          </ul>
          <p>
            These multipliers reflect the exponential increase in difficulty as
            the number of allowed mistakes decreases.
          </p>
          <p>
            While a theoretical solver with perfect strategy might breeze
            through with fewer mistakes, real players tend to rely more on
            guesses than hints. Because of this human behavior, the actual
            difficulty progression (and score potential) more closely matches
            these multipliers than a purely mathematical model might suggest. As
            a result, players who perform well on Hard mode are rewarded for
            both skill and optimal strategy.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Hardcore Mode</h3>
          <p>
            Hardcore mode removes all spaces and punctuation from the encrypted
            text, making pattern recognition significantly more challenging:
          </p>
          <ul>
            <li>
              <strong>Regular Mode:</strong> 1.0× multiplier (baseline)
            </li>
            <li>
              <strong>Hardcore Mode:</strong> 1.8× multiplier
            </li>
          </ul>
          <p>
            The 1.8× multiplier represents the ~80% increase in difficulty when
            spaces and punctuation are removed.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Mistake and Time Factors</h3>
          <p>
            Your score is adjusted based on the number of mistakes made and time
            taken:
          </p>
          <ul>
            <li>
              <strong>Mistake Factor:</strong> e<sup>(-0.15 × mistakes)</sup>
            </li>
            <li>
              <strong>Time Factor:</strong> e<sup>(-0.0008 × seconds)</sup>
            </li>
          </ul>
          <p>
            Both factors gradually decrease your score as you make more mistakes
            or take more time, but are designed to ensure even lengthy games
            with a few mistakes can still earn respectable scores.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Scoring Examples</h3>
          <h4>Example 1: Perfect Game on Medium Difficulty</h4>
          <div className="example-calculation">
            <p>
              <strong>Game Parameters:</strong>
            </p>
            <ul>
              <li>Difficulty: Medium (2.5× multiplier)</li>
              <li>Hardcore Mode: No (1.0× multiplier)</li>
              <li>Mistakes: 0</li>
              <li>Time: 3 minutes (180 seconds)</li>
            </ul>
            <p>
              <strong>Calculation:</strong>
            </p>
            <ul>
              <li>Base Score: 1000</li>
              <li>Difficulty Multiplier: 2.5</li>
              <li>Hardcore Multiplier: 1.0</li>
              <li>
                Mistake Factor: e<sup>(-0.15 × 0)</sup> = 1.0
              </li>
              <li>
                Time Factor: e<sup>(-0.0008 × 180)</sup> ≈ 0.866
              </li>
            </ul>
            <p>
              <strong>Final Score:</strong> 1000 × 2.5 × 1.0 × 1.0 × 0.866 ≈
              2,165 points
            </p>
          </div>

          <h4>Example 2: Hard Game with Hardcore Mode</h4>
          <div className="example-calculation">
            <p>
              <strong>Game Parameters:</strong>
            </p>
            <ul>
              <li>Difficulty: Hard (6.25× multiplier)</li>
              <li>Hardcore Mode: Yes (1.8× multiplier)</li>
              <li>Mistakes: 2</li>
              <li>Time: 5 minutes (300 seconds)</li>
            </ul>
            <p>
              <strong>Calculation:</strong>
            </p>
            <ul>
              <li>Base Score: 1000</li>
              <li>Difficulty Multiplier: 6.25</li>
              <li>Hardcore Multiplier: 1.8</li>
              <li>
                Mistake Factor: e<sup>(-0.15 × 2)</sup> ≈ 0.741
              </li>
              <li>
                Time Factor: e<sup>(-0.0008 × 300)</sup> ≈ 0.786
              </li>
            </ul>
            <p>
              <strong>Final Score:</strong> 1000 × 6.25 × 1.8 × 0.741 × 0.786 ≈
              6,604 points
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h3>Maximizing Your Score</h3>
          <p>To achieve the highest possible score:</p>
          <ul>
            <li>Play on Hard difficulty (6.25× multiplier)</li>
            <li>Enable Hardcore Mode (1.8× multiplier)</li>
            <li>Make zero mistakes (1.0 mistake factor)</li>
            <li>
              Solve the puzzle as quickly as possible (higher time factor)
            </li>
          </ul>
          <p>
            The theoretical maximum multiplier is 11.25× (6.25 for Hard × 1.8
            for Hardcore), before accounting for time.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Future Scoring Refinements</h3>
          <p>
            We continuously work to improve our scoring system for fairness.
            We're gathering data on additional factors that affect puzzle
            difficulty, including:
          </p>
          <ul>
            <li>
              <strong>Quote Length</strong> - longer quotes provide more context
              but require more time
            </li>
            <li>
              <strong>Unique Letter Count</strong> - quotes with more diverse
              letters are typically harder to solve
            </li>
            <li>
              <strong>Common Word Presence</strong> - quotes containing common
              words like "the" or "and" can be easier to decrypt
            </li>
            <li>
              <strong>Letter Frequency Distribution</strong> - how closely the
              quote matches standard English letter patterns
            </li>
          </ul>
          <p>
            As we analyze player performance data across different quote types,
            we'll refine our scoring algorithm to better account for these
            factors. Our goal is to create the most accurate and fair scoring
            system possible.
          </p>
        </section>

        <div className="privacy-footer">
          <p>Last updated: March 19, 2025</p>
          <button className="return-button" onClick={() => navigate("/")}>
            Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scoring;
