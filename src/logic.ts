import type { GameOverResult, PlayerId, RuneClient } from "rune-sdk";
import { RAW_ASSETS } from "./lib/rawassets";

// The amount of time a question is shown for
export const QUESTION_TIME = 15000;
// The amount of time the answers are shown for after players have answered
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

export type Language = "en" | "ru" | "es" | "pt";
export const SUPPORTED_LANGUAGES: Language[] = ["en", "ru", "es", "pt"];

// the big list of questions to choose from
export const QUESTIONS: Record<Language, Question[]> = {
  en: JSON.parse(RAW_ASSETS["theme/questions_en.json"]),
  ru: JSON.parse(RAW_ASSETS["theme/questions_ru.json"]),
  es: JSON.parse(RAW_ASSETS["theme/questions_es.json"]),
  pt: JSON.parse(RAW_ASSETS["theme/questions_pt.json"]),
};


// A single question 
export interface Question {
  // the category the question is assigned to
  category: string;
  // the question text
  question: string;
  // the label for the correct answer - from the JSON naming
  correct_answer: string;
  // the label for the other incorrect answers - from the JSON naming
  incorrect_answers: string[];
  // the list of the possible answers
  answers: string[];
  id: number;
  image: string;
}

// The state the player is in - WAITING at the start, THINKING before they answered, READY when they've answered
export type Status = "WAITING" | "THINKING" | "READY" | "FASTEST";

export interface GameState {
  persisted?: Record<PlayerId, Persisted>;
  // the list of questions for the quiz
  questions: Question[];
  // the current question
  question: Question;
  // the number (not index) of the question
  questionNumber: number;
  // The status of all the players
  playerStatus: Record<PlayerId, Status>;
  // The answers selected by the players
  playerAnswers: Record<PlayerId, number>;
  lastAnswers: Record<PlayerId, number>;
  // The amount of points each player has
  playerScores: Record<PlayerId, number>;
  // How long should the clients wait before moving to the next question
  timeOut: number;
  // The language being played
  lang: Language;
  // The index of the correct answer in the answers array - only set
  // after players answer
  correctAnswerIndex: number;
  // True if we're playing with the timer enabled
  timerEnabled: boolean;
  // The number of questions we're playing
  questionCount: number;
  // True if the game is complete
  complete: boolean;
}

type GameActions = {
  // start the game - whoever presses the start button first hits this
  start: () => void;
  // answer a question 
  answer: (params: { index: number }) => void;
  // indication that the player's client thinks the timer requested has expired - 
  // this is used so we don't have to have an update loop in the logic
  timeDone: (params: { index: number }) => void;
  // Used to set the number of questions the player wants to play
  questions: (params: { count: number }) => void;
  // Used to set whether the player wants timer enabled
  timer: (params: { enabled: boolean }) => void;
  // select a language
  language: (params: { lang: Language }) => void;
};

export type Persisted = {
  questionsSeen: Record<number, number>;
}

declare global {
  const Rune: RuneClient<GameState, GameActions, Persisted>;
}

function checkAllAnswersIn(game: GameState): void {
  // if everyone is ready skip the timer and move to the
  // next question
  if (!Object.values(game.playerStatus).find(a => a !== "READY" && a !== "FASTEST")) {
    // all players ready
    nextQuestion(game);
  }
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  persistPlayerData: true,
  setup: (allPlayerIds) => {
    const lang: Language = "en";

    // set up all initial data
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
      lastAnswers: {},
      timeOut: 0,
      lang: "en",
      playerScores: scores,
      correctAnswerIndex: 0,
      questionCount: 5,
      timerEnabled: false,
      complete: false,
      pill: { x: 0, y: 0 },
    };
  },
  actions: {
    language({ lang }, context) {
      context.game.lang = lang;
    },
    start(_, context) {
      // start is only valid if we haven't started yet, i.e.
      // we're on question number 0
      if (context.game.questionNumber === 0) {
        // setup the configuration for the game

        // pull the complete list of questions from the static store (its a big
        // set so don't put it all in game state). Shuffle the questions 
        context.game.questions = [...QUESTIONS[context.game.lang]];

        const inverseWeights: Record<number, number> = {};
        for (const q of context.game.questions) {
          inverseWeights[q.id] = 0;
        }
        for (const pid of context.allPlayerIds) {
          const persisted = context.game.persisted[pid];
          if (persisted && persisted.questionsSeen) {
            for (const q of context.game.questions) {
              inverseWeights[q.id] = persisted.questionsSeen[q.id];
            }
          }
        }

        inverseWeights[1] = 10;

        context.game.questions.sort((a, b) => {
          return inverseWeights[a.id] - inverseWeights[b.id];
        })

        context.game.questions = context.game.questions.slice(0, Math.max(context.game.questionCount + 1, context.game.questions.length * 0.25));
        shuffle(context.game.questions)
        context.game.questions = context.game.questions.slice(0, context.game.questionCount + 1);
        nextQuestion(context.game);
        // on the first question we don't want to include ANSWER_TIME since we don't
        // have any to show
        context.game.timeOut = Rune.gameTime() + QUESTION_TIME;
      }
    },
    answer({ index }, context) {
      // store the answer and set the status
      context.game.playerAnswers[context.playerId] = index;
      context.game.playerStatus[context.playerId] =
        !Object.values(context.game.playerStatus).find(a => a === "FASTEST") ? "FASTEST" : "READY";

      checkAllAnswersIn(context.game);
    },
    timeDone({ index }, context) {
      // if the timer expires (based on any client telling us it has) and the
      // game is complete we want to report scores and game over
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

      // since we might get timeDone from multiple players we
      // only act on it if they're indicating the timeDone is for
      // the current question
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
  events: {
    playerJoined(playerId, eventContext) {
      eventContext.game.playerScores[playerId] = 0;
      eventContext.game.playerStatus[playerId] = eventContext.game.questionNumber > 0 ? "THINKING" : "WAITING";
    },
    playerLeft(playerId, eventContext) {
      delete eventContext.game.playerAnswers[playerId];
      delete eventContext.game.playerScores[playerId];
      delete eventContext.game.playerStatus[playerId];

      checkAllAnswersIn(eventContext.game);
    },
  }
});

function nextQuestion(game: GameState) {
  // work out the correct answer, update the state so the client
  // can show the correct one and update player scores for those
  // that got the right question
  if (game.question.answers) {
    game.correctAnswerIndex = game.question.answers.indexOf(game.question.correct_answer);
    for (const id of Object.keys(game.playerAnswers)) {
      if (game.playerAnswers[id] === game.correctAnswerIndex) {
        game.playerScores[id]++;
        if (game.playerStatus[id] === "FASTEST") {
          game.playerScores[id]++;
        }
      }
    }
  }

  // move to the next question
  game.questionNumber++;

  // if we've run out of questions the quiz is over, schedule
  // the clients to wait a bit to show the last question answers
  // then report in with timeDone to do the final game over
  if (game.questionNumber >= game.questions.length) {
    game.lastAnswers = { ...game.playerAnswers };
    game.questionNumber++;
    game.timeOut = Rune.gameTime() + QUESTION_TIME + ANSWER_TIME;
    game.complete = true;
    return;
  }

  // take a copy of the question so we can manipulate it
  game.question = { ...game.questions[game.questionNumber] };
  game.question.answers = [game.question.correct_answer, ...game.question.incorrect_answers];

  // record which questions a player is seeing
  for (const p of Object.keys(game.playerStatus)) {
    const playerPersisted = game.persisted?.[p];
    if (playerPersisted) {
      if (!playerPersisted.questionsSeen) {
        playerPersisted.questionsSeen = {};
      }

      playerPersisted.questionsSeen[game.question.id] = (playerPersisted.questionsSeen[game.question.id] ?? 0) + 1;
    }
  }
  // mix up the answers to they don't appear in the same place every time
  shuffle(game.question.answers);

  // schedule the clients to show the answers, then the next question
  game.timeOut = Rune.gameTime() + QUESTION_TIME + ANSWER_TIME;
  game.lastAnswers = { ...game.playerAnswers };
  for (const key of Object.keys(game.playerStatus)) {
    game.playerStatus[key] = "THINKING";
    game.playerAnswers[key] = -1;
  }
}
