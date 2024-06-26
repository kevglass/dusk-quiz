import type { GameOverResult, PlayerId, RuneClient } from "rune-games-sdk/multiplayer";
import { ASSETS } from "./lib/rawassets";

// The amount of time a question is shown for
export const QUESTION_TIME = 15000;
export const ANSWER_TIME = 3000;

// taken from https://stackoverflow.com/questions/15860715/typescript-array-vs-any
function shuffle<T>(array: Array<T>) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
}

const QUESTIONS: Record<string, Question[]> = {
  en: JSON.parse(ASSETS["questions_en.json"]),
};

export interface Question {
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  answers: string[];
}

export type Status = "WAITING" | "THINKING" | "READY";

export interface GameState {
  questions: Question[];
  question: Question;
  questionNumber: number;
  playerStatus: Record<PlayerId, Status>;
  playerAnswers: Record<PlayerId, number>;
  playerScores: Record<PlayerId, number>;
  timeOut: number;
  lang: string;
  correctAnswerIndex: number;
  timerEnabled: boolean;
  questionCount: number;
  complete: boolean;
}

type GameActions = {
  start: (params: { lang: string }) => void;
  answer: (params: { index: number }) => void;
  timeDone: (params: { index: number }) => void;
  questions: (params: {count: number }) => void;
  timer: (params: { enabled: boolean }) => void;
};

declare global {
  const Rune: RuneClient<GameState, GameActions>;
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (allPlayerIds) => {
    const lang = "en";

    const status: Record<PlayerId, Status> = {};
    const scores: Record<PlayerId, number> = {};
    for (const id of allPlayerIds) {
      status[id] = "WAITING";
      scores[id] = 0;
    }

    return {
      questions: [],
      question: QUESTIONS[lang][0],
      questionNumber: 0,
      playerStatus: status,
      playerAnswers: {},
      timeOut: 0,
      lang: "",
      playerScores: scores,
      correctAnswerIndex: 0,
      questionCount: 5,
      timerEnabled: true,
      complete: false
    };
  },
  actions: {
    start({ lang }, context) {
      if (context.game.questionNumber === 0) {
        // setup the configuration for the game
        context.game.lang = lang;

        // pull the complete list of questions from the static store (its a big
        // set so don't put it all in game state). Shuffle the questions 
        context.game.questions = [...QUESTIONS[lang]];
        shuffle(context.game.questions);
        context.game.questions = context.game.questions.slice(0, context.game.questionCount + 1);

        nextQuestion(context.game);
        context.game.timeOut = Rune.gameTime() + QUESTION_TIME;
      }
    },
    answer({ index }, context) {
      context.game.playerAnswers[context.playerId] = index;
      context.game.playerStatus[context.playerId] = "READY";

      if (!Object.values(context.game.playerStatus).find(a => a !== "READY")) {
        // all players ready
        nextQuestion(context.game);
      }
    },
    timeDone({ index }, context) {
      if (context.game.complete) {
        const results: Record<PlayerId, GameOverResult> = {};
        const highest = Math.max(...Object.values(context.game.playerScores));
    
        for (const id of Object.keys(context.game.playerScores)) {
          if (context.game.playerScores[id] >= highest) {
            results[id] = "WON";
          } else {
            results[id] = "LOST";
          }
        }
        
        Rune.gameOver({ players: results })
        return;
      }
      if (index === context.game.questionNumber) {
        nextQuestion(context.game);
      }
    },
    timer({ enabled }, context) {
      context.game.timerEnabled = enabled;
    },
    questions({ count }, context) {
      context.game.questionCount = count;
    }
  },
});

function nextQuestion(game: GameState) {
  if (game.question.answers) {
    game.correctAnswerIndex = game.question.answers.indexOf(game.question.correct_answer);
    for (const id of Object.keys(game.playerAnswers)) {
      if (game.playerAnswers[id] === game.correctAnswerIndex) {
        game.playerScores[id]++;
      }
    }
  }
  game.questionNumber++;
  if (game.questionNumber >= game.questions.length) {
    game.questionNumber++;
    game.timeOut = Rune.gameTime() + QUESTION_TIME + ANSWER_TIME;
    game.complete = true;
    return;
  }

  game.question = {...game.questions[game.questionNumber]};
  game.question.answers = [game.question.correct_answer, ...game.question.incorrect_answers];
  shuffle(game.question.answers);
  game.timeOut = Rune.gameTime() + QUESTION_TIME + ANSWER_TIME;
  for (const key of Object.keys(game.playerStatus)) {
    game.playerStatus[key] = "THINKING";
    game.playerAnswers[key] = -1;
  }
}
