import { PlayerId } from "rune-sdk";
import { ANSWER_TIME, GameState, Language, QUESTIONS, QUESTION_TIME, SUPPORTED_LANGUAGES } from "./logic";
import mp3_correct from "./assets/core/correct.mp3";
import mp3_click from "./assets/core/click.mp3";
import mp3_incorrect from "./assets/core/incorrect.mp3";
import mp3_start from "./assets/core/start.mp3";
import { TRANSLATIONS } from "./translation";
import { ASSETS } from "./lib/assets";
import { RAW_ASSETS } from "./lib/rawassets";

(document.getElementById("backgroundImage") as HTMLImageElement).src = ASSETS["theme/bg.png"];
(document.getElementById("stylesheetReference") as HTMLLinkElement).href = ASSETS["theme/style.css"];

const manifest = JSON.parse(RAW_ASSETS["theme/manifest.json"]);
(document.getElementById("disclaimer") as HTMLDivElement).innerHTML = manifest.disclaimer;

for (const q of QUESTIONS.en) {
  if (q.image) {
    if (!ASSETS[q.image]) {
      console.log(q.image + " not found");
    }
  }
}
// sound played for an correct answer
const SOUND_CORRECT = new Audio(mp3_correct);
// sound played for an incorrect answer
const SOUND_INCORRECT = new Audio(mp3_incorrect);
// sound played on a UI click
const SOUND_CLICK = new Audio(mp3_click);
// sound played at the start of a question
const SOUND_START = new Audio(mp3_start);

// Utility to play sounds and make sure they always play
// when asked by restarting the audio if needed
function play(audio: HTMLAudioElement) {
  if (audio.paused) {
    audio.play();
  } else {
    audio.currentTime = 0
  }
}

// the player DIV elements keyed on the player ID
const playerDiv: Record<PlayerId, HTMLDivElement> = {};

// create the DIV and sub-elements that represent the player
// at the top of the screen.
function createPlayerDiv(id: string): void {
  const div = playerDiv[id] = document.createElement("div") as HTMLDivElement;
  div.id = id;
  div.className = "player";
  const info = Rune.getPlayerInfo(id);
  const name = document.createElement("div") as HTMLDivElement;
  name.className = "playerName";
  name.innerHTML = info.displayName;
  const img = document.createElement("img") as HTMLImageElement;
  img.className = "playerAvatar";
  img.src = info.avatarUrl.replace("circleCrop=1", ""); 

  const status = document.createElement("div") as HTMLDivElement;
  status.className = "playerStatus";
  status.innerHTML = "waiting";

  const score = document.createElement("div") as HTMLDivElement;
  score.className = "playerScore";
  score.innerHTML = "0";

  const correct = document.createElement("div") as HTMLDivElement;
  correct.className = "check";

  div.appendChild(img);
  div.appendChild(name);
  div.appendChild(status);
  div.appendChild(score);
  div.appendChild(correct);

  document.getElementById("players")?.appendChild(div);

  for (let i = 0; i < 4; i++) {
    const slots = document.getElementById("answer" + (i + 1) + "-slots") as HTMLDivElement;

    const img = document.createElement("img") as HTMLImageElement;
    img.className = "smallAvatar";
    img.src = info.avatarUrl;
    img.id = "answer" + i + "-" + id;
    img.style.display = "none";

    slots.appendChild(img);
  }
}

// When any player clicks the ready button send their language
// and choice of options to the game.
document.getElementById("startGame")?.addEventListener("click", () => {
  Rune.actions.start();
});

// Questions number selection listeners
document.getElementById("q5")?.addEventListener("click", () => {
  Rune.actions.questions({ count: 5 });
  play(SOUND_CLICK);
});
document.getElementById("q10")?.addEventListener("click", () => {
  Rune.actions.questions({ count: 10 });
  play(SOUND_CLICK);
});
document.getElementById("q20")?.addEventListener("click", () => {
  Rune.actions.questions({ count: 20 });
  play(SOUND_CLICK);
});
// Time enabled selection listeners
document.getElementById("timerYes")?.addEventListener("click", () => {
  Rune.actions.timer({ enabled: true });
  play(SOUND_CLICK);
});
document.getElementById("timerNo")?.addEventListener("click", () => {
  Rune.actions.timer({ enabled: false });
  play(SOUND_CLICK);
});

// for all the answer buttons we want to react to a click by invoking
// an action so the game state is updated and all players have the information
for (let i = 0; i < 4; i++) {
  const answerButton = document.getElementById("answer" + (i + 1));
  answerButton?.addEventListener("click", () => {
    // only allow the player to select an answer once
    if (!selectedAnswer && !showingAnswers) {
      play(SOUND_CLICK);
      selectedAnswer = true;
      Rune.actions.answer({ index: i });

      if (!answerButton?.classList.contains("selected")) {
        answerButton?.classList.add("selected");
      }
    }
  })
}

function updateLanguage(lang: Language) {
  currentLanguage = lang;
  (document.getElementById("readyTitle") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].quizTime;
  (document.getElementById("howMany") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].howManyQuestions;
  (document.getElementById("startGame") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].letsPlay;
  (document.getElementById("timerNo") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].no;
  (document.getElementById("timerYes") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].yes;
  (document.getElementById("timedQuestions") as HTMLDivElement).innerHTML = TRANSLATIONS[lang].timedQuestions;

  const items = Array.from(document.getElementsByClassName("language"));
  for (const item of items) {
    const element = item as HTMLDivElement;
    const elementLang = item.id.substring("lang-".length, "lang-".length + 2) as Language;

    if (elementLang === lang) {
      element.style.border = "3px solid grey";
    } else {
      element.style.border = "";
    }
  }
}

let currentLanguage: Language = "en";
updateLanguage(currentLanguage);

const items = Array.from(document.getElementsByClassName("language"));
for (const item of items) {
  item.addEventListener("click", () => {
    const lang = item.id.substring("lang-".length, "lang-".length + 2) as Language;
    Rune.actions.language({ lang });
  });
}

(document.getElementById("lang-es") as HTMLDivElement).style.display = "block";
(document.getElementById("lang-ru") as HTMLDivElement).style.display = "block";
if (navigator.language.toLowerCase().startsWith("en-us")) {
  (document.getElementById("lang-en2") as HTMLDivElement).style.display = "block";
} else {
  (document.getElementById("lang-en1") as HTMLDivElement).style.display = "block";
}
if (navigator.language.toLowerCase().startsWith("pr-br")) {
  (document.getElementById("lang-pt2") as HTMLDivElement).style.display = "block";
} else {
  (document.getElementById("lang-pt1") as HTMLDivElement).style.display = "block";
}


// the last question we displayed, track this
// so we can track when the game is moving through questions
let lastQuestion = 0;
// a time relative the start of game so that we can have a turn
// based game with smooth timers
let timeExpires = 0;
// Has the game started?
let started = false;
// Is the questions timer running?
let timerRunning = true;
// Are we currently in the phase where we show the answers to the question
let showingAnswers = false;
// True if this player has selected an answer for this question
let selectedAnswer = false;
// Indicates whether question timing is enabled based on what the
// the shared game state told us
let timerEnabled = false;
// Indicates how many questions to play based on what the
// the shared game state told us
let questionCount = 10;
// Indicates whether this client has sent the end of game message
let sentEnd = false;
// Indicates whether the game is complete based on the shared
// game state
let complete = false;

let gameState: GameState;
let sentLanguage = false;

// Very simple update loop so we can smooth animations
// and changes to the game that aren't driven by specific actions
setInterval(() => {
  // if we're showing the answers we want to not how the time bar,
  // show the player correct/incorrect for the last question
  // and if this is the very last question send the timeDone action
  // to tell the game state that this client has completed
  if (showingAnswers) {
    const bar = document.getElementById("timebar") as HTMLDivElement;
    bar.style.opacity = "0";
    for (const div of Object.values(playerDiv)) {
      const statusDiv = div.getElementsByClassName("playerStatus").item(0) as HTMLDivElement;
      statusDiv.style.display = "none";
    }

    // check if we've just completed the last question - if so
    // then clear the question board (maybe show winners here at some point?)
    const msLeft = timeExpires - Date.now();
    if (msLeft < QUESTION_TIME && !sentEnd && complete) {
      Rune.actions.timeDone({ index: lastQuestion });
      sentEnd = true;
      document.getElementById("ready")!.style.display = "none";
      document.getElementById("disclaimer")!.style.display = "none";
      document.getElementById("question")!.style.display = "none";
    }
    return;
  } else {
    if (gameState && gameState.question && gameState.question.answers) {
      document.getElementById("questionNumber")!.innerHTML = TRANSLATIONS[gameState.lang].question + " " + gameState.questionNumber;
      document.getElementById("questionText")!.innerHTML = gameState.question.question;

      if (gameState.question.image) {
        (document.getElementById("questionImage") as HTMLImageElement).src = ASSETS[gameState.question.image];
        (document.getElementById("imageHolder") as HTMLDivElement).style.display = "block";
      } else {
        (document.getElementById("imageHolder") as HTMLDivElement).style.display = "none";
      }
      for (let i = 0; i < 4; i++) {
        document.getElementById("answer" + (i + 1) + "-value")!.innerHTML = gameState.question.answers[i];
        const slots = document.getElementById("answer" + (i + 1) + "-slots") as HTMLDivElement
        for (const avatar of Array.from(slots.children)) {
          if (avatar) {
            (avatar as HTMLElement).style.display = "none";
          }
        }
      }
    }

    // otherwise just make sure player status bars are showing
    for (const div of Object.values(playerDiv)) {
      const statusDiv = div.getElementsByClassName("playerStatus").item(0) as HTMLDivElement;
      statusDiv.style.display = "block";
    }
  }

  if (!timerEnabled) {
    return;
  }

  // the timer bar for questions logic
  if (started) {
    // how long have we got til the timer ont he question expires?
    const msLeft = timeExpires - Date.now();
    if (msLeft > 0) {
      // if we have time left just render the bar appropriately
      const ratio = msLeft / QUESTION_TIME;
      const bar = document.getElementById("timebar") as HTMLDivElement;
      if (ratio < 1) {
        bar.style.width = (ratio * 100) + "%";
        bar.style.opacity = "1";
      } else {
        bar.style.opacity = "0";
      }
    } else {
      // if the timer has run out and we haven't yet notified the server
      // then fire the timeDone action. This is so the timing can 
      // be handled on the client and theres no requirement for an update
      // loop in the logic
      if (timerRunning) {
        timerRunning = false;
        Rune.actions.timeDone({ index: lastQuestion });
        const bar = document.getElementById("timebar") as HTMLDivElement;
        bar.style.opacity = "0";
      }
    }
  }
}, 50)

window.addEventListener("load", () => {
  Rune.initClient({
    onChange: ({ game, allPlayerIds, yourPlayerId, action }) => {
      if (!sentLanguage) {
        if (navigator.language) {
          const lang = navigator.language.substring(0, 2).toLowerCase() as Language;

          if (SUPPORTED_LANGUAGES.includes(lang)) {
            sentLanguage = true;
            setTimeout(() => {
              Rune.actions.language({ lang })
            }, 1);
          }
        }
      }

      gameState = game;

      // record game state to globals for use in the timer
      questionCount = game.questionCount;
      timerEnabled = game.timerEnabled;
      complete = game.complete;

      if (game.lang !== currentLanguage) {
        updateLanguage(game.lang);
      }
      // update the status of the selectors to shows whats in game state
      (document.getElementById("q5") as HTMLDivElement).className = questionCount === 5 ? "option optionSelected" : "option";
      (document.getElementById("q10") as HTMLDivElement).className = questionCount === 10 ? "option optionSelected" : "option";
      (document.getElementById("q20") as HTMLDivElement).className = questionCount === 20 ? "option optionSelected" : "option";

      (document.getElementById("timerYes") as HTMLDivElement).className = timerEnabled === true ? "option optionSelected" : "option";
      (document.getElementById("timerNo") as HTMLDivElement).className = timerEnabled === false ? "option optionSelected" : "option";

      // only show the timing bar if timers are enabed
      const bar = document.getElementById("timebar") as HTMLDivElement;
      bar.style.display = timerEnabled ? "block" : "none";

      // since the onChange can be called for various reasons we do must of 
      // the logic only when a question changes
      const questionChanged = lastQuestion !== game.questionNumber;
      if (questionChanged) {
        if (game.questionNumber === 0) {
          // game restart so clear state and show the ready screen
          document.getElementById("ready")!.style.display = "block";
          document.getElementById("question")!.style.display = "none";
          lastQuestion = 0;
          sentEnd = false;
          return;
        }

        if (lastQuestion === 0) {
          started = true;
          // game start so show the first question
          document.getElementById("ready")!.style.display = "none";
          document.getElementById("disclaimer")!.style.display = "none";
          document.getElementById("question")!.style.display = "block";

          for (const q of game.questions) {
            if (q.image) {
              const image = new Image();
              image.src = ASSETS[q.image];
            }
          }
        } else {
          // otherwise we're showing the answers so highlight the right quiz
          const answerDiv = document.getElementById("answer" + (game.correctAnswerIndex + 1)) as HTMLDivElement;
          answerDiv.classList.add("correct");

          for (const pid of Object.keys(game.lastAnswers)) {
            const id = "answer" + game.lastAnswers[pid] + "-" + pid;
            const img = document.getElementById(id) as HTMLImageElement;
            if (img) {
              img.style.display = "inline-block";
            }
          }
        }

        selectedAnswer = false;

        // since we're turn based game logic but we still want
        // to pause for a bit while we show the answers before updating
        // to match new game state we'll work out the time delay required by the
        // server and then only apply the updates after that timeout
        const offset = (game.timeOut - Rune.gameTime()) - QUESTION_TIME;
        timeExpires = Date.now() + (game.timeOut - Rune.gameTime());
        showingAnswers = true;

        if (!game.complete) {
          setTimeout(() => {
            // reflect the new game state (new question) after the fixed answer
            // period of time 
            play(SOUND_START);
            showingAnswers = false;
            lastQuestion = game.questionNumber;

            // reset local state
            for (let i = 0; i < 4; i++) {
              const answerButton = document.getElementById("answer" + (i + 1));
              answerButton?.classList.remove("selected");
              answerButton?.classList.remove("correct");
            }
            timerRunning = true;
          }, offset);
        }
      }

      // remove any players that left
      for (const existing of Object.keys(playerDiv)) {
        if (!allPlayerIds.includes(existing)) {
          playerDiv[existing].parentElement?.removeChild(playerDiv[existing]);

          for (let i = 0; i < 4; i++) {
            const smallAvatar = document.getElementById("answer" + i + "-" + existing) as HTMLImageElement;
            if (smallAvatar) {
              smallAvatar.parentElement?.removeChild(smallAvatar);
            }
          }
        }
      }

      const correctAnswerIds: PlayerId[] = [];
      for (const id of allPlayerIds) {
        // add a DIV for any player we don't already have one for
        if (!playerDiv[id]) {
          createPlayerDiv(id);
        }

        // set the visual status based on game state
        const statusDiv = playerDiv[id].getElementsByClassName("playerStatus").item(0) as HTMLDivElement;
        const status = game.playerStatus[id];
        statusDiv.innerHTML = status;
        statusDiv.className = "playerStatus " + game.playerStatus[id];

        // set the players score based on game state
        const scoreDiv = playerDiv[id].getElementsByClassName("playerScore").item(0) as HTMLDivElement;
        const newScore = "" + game.playerScores[id];
        // if the score changed then the player got a point, so show the
        // checkm ark on the player
        if (newScore !== scoreDiv.innerHTML) {
          correctAnswerIds.push(id);
          scoreDiv.innerHTML = newScore;
          const checkDiv = playerDiv[id].getElementsByClassName("check").item(0) as HTMLDivElement;
          checkDiv.style.display = "block";
          setTimeout(() => {
            checkDiv.style.display = "none";
          }, ANSWER_TIME - 500)
        }
      }

      // if the question just changed and its not the end of the game (timeDone action) then
      // play the appropriate sound effect for right/wrong
      if (questionChanged && yourPlayerId && game.questionNumber > 1 && action?.action !== "timeDone") {
        if (correctAnswerIds.includes(yourPlayerId)) {
          play(SOUND_CORRECT);
        } else {
          play(SOUND_INCORRECT);
        }
      }

    },
  })
});