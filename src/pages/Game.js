// src/components/Game.js
import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useAppContext } from "../AppContext";
import useSound from "../SoundManager";
import useKeyboardInput from "../KeyboardController";
import { formatAlternatingLines, preventWordBreaks } from "../utils";
import WinCelebration from "../WinCelebration";
import MobileLayout from "../MobileLayout";
import apiService from "../apiService";
import GameHeader from "./GameHeader";
import TextContainer from "./TextContainer";
import GameControls from "./GameControls";
import GameOver from "./GameOver";
import LetterCell from "./LetterCell";

// Copy the reducer and initialState from App.js
// Copy the Game component logic

// Export the Game component
export default Game;
