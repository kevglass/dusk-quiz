import { PlayerId } from "rune-games-sdk";
import { ANSWER_TIME, QUESTION_TIME } from "./logic";
import mp3_correct from "./assets/correct.mp3";
import mp3_click from "./assets/click.mp3";
import mp3_incorrect from "./assets/incorrect.mp3";
import mp3_start from "./assets/start.mp3";

const SOUND_CORRECT = new Audio(mp3_correct);
const SOUND_INCORRECT = new Audio(mp3_incorrect);
const SOUND_CLICK = new Audio(mp3_click);
const SOUND_START = new Audio(mp3_start);

function play(audio: HTMLAudioElement) {
  if (audio.paused) {
      audio.play();
  }else{
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
  img.src = info.avatarUrl.replace("circleCrop=1", "").replace("png", "jpg");

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
}

// When any player clicks the ready button send their language
// and choice of options to the game.
document.getElementById("startGame")?.addEventListener("click", () => {
  Rune.actions.start({ lang: "en" });
});

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
document.getElementById("timerYes")?.addEventListener("click", () => {
  Rune.actions.timer({ enabled: true });
  play(SOUND_CLICK);
});
document.getElementById("timerNo")?.addEventListener("click", () => {
  Rune.actions.timer({ enabled: false });
  play(SOUND_CLICK);
});

for (let i=0;i<4;i++) {
  const answerButton = document.getElementById("answer" + (i+1));
  answerButton?.addEventListener("click", () => {
    if (!selectedAnswer) {
      play(SOUND_CLICK);
      selectedAnswer = true;
      Rune.actions.answer({ index: i });
      if (!answerButton?.classList.contains("selected")) {
        answerButton?.classList.add("selected");
      }
    }
  })
}

let lastQuestion = 0;
let timeExpires = 0;
let started = false;
let timerRunning = true;
let showingAnswers = false;
let selectedAnswer = false;
let timerEnabled = false;
let questionCount = 10;
let sentEnd = false;
let complete = false;
let timeOfLastSfx = 0;

setInterval(() => {
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
      document.getElementById("question")!.style.display = "none";
    }
    return;
  } else {
    for (const div of Object.values(playerDiv)) {
      const statusDiv = div.getElementsByClassName("playerStatus").item(0) as HTMLDivElement;
      statusDiv.style.display = "block";
    }
  }

  if (!timerEnabled) {
    return;
  }


  if (started) {
    const msLeft = timeExpires - Date.now();
    if (msLeft > 0) {
      const ratio = msLeft / QUESTION_TIME;
      const bar = document.getElementById("timebar") as HTMLDivElement;
      if (ratio < 1) {
        bar.style.width = (ratio*100)+"%";
        bar.style.opacity = "1";
      } else {
        bar.style.opacity = "0";
      }
    } else {
      if (timerRunning) {
        timerRunning = false;
        Rune.actions.timeDone({ index: lastQuestion });
        const bar = document.getElementById("timebar") as HTMLDivElement;
        bar.style.opacity = "0";
      }
    }
  }
}, 50)

Rune.initClient({
  onChange: ({ game, allPlayerIds, yourPlayerId, action }) => {
    questionCount = game.questionCount;
    timerEnabled = game.timerEnabled;
    complete = game.complete;

    (document.getElementById("q5") as HTMLDivElement).className = questionCount === 5 ? "option optionSelected" : "option";
    (document.getElementById("q10") as HTMLDivElement).className = questionCount === 10 ? "option optionSelected" : "option";
    (document.getElementById("q20") as HTMLDivElement).className = questionCount === 20 ? "option optionSelected" : "option";

    (document.getElementById("timerYes") as HTMLDivElement).className = timerEnabled === true ? "option optionSelected" : "option";
    (document.getElementById("timerNo") as HTMLDivElement).className = timerEnabled ===false ? "option optionSelected" : "option";

    const bar = document.getElementById("timebar") as HTMLDivElement;
    bar.style.display = timerEnabled ? "block" : "none";

    const questionChanged = lastQuestion !== game.questionNumber;
    if (questionChanged) {
      if (game.questionNumber === 0) {
        // game restart
        document.getElementById("ready")!.style.display = "block";
        document.getElementById("question")!.style.display = "none";
        lastQuestion = 0;
        sentEnd = false;
        return;
      }

      if (lastQuestion === 0) {
        started = true;
        // game start
        document.getElementById("ready")!.style.display = "none";
        document.getElementById("question")!.style.display = "block";

      } else {
        const answerDiv = document.getElementById("answer"+(game.correctAnswerIndex+1)) as HTMLDivElement;
        answerDiv.classList.add("correct");
      }
      
      selectedAnswer = false;

      const offset = (game.timeOut - Rune.gameTime()) - QUESTION_TIME;
      timeExpires = Date.now() + (game.timeOut - Rune.gameTime());
      showingAnswers = true;
      if (!game.complete) {
        setTimeout(() => {
          play(SOUND_START);
          showingAnswers = false;
          // reset local state
          for (let i=0;i<4;i++) {
            const answerButton = document.getElementById("answer" + (i+1));
            answerButton?.classList.remove("selected");
            answerButton?.classList.remove("correct");
          }
          lastQuestion = game.questionNumber;
          timerRunning = true;
          document.getElementById("questionNumber")!.innerHTML = "Question " + game.questionNumber;
          document.getElementById("questionText")!.innerHTML = game.question.question;
          for (let i=0;i<4;i++) {
            document.getElementById("answer"+(i+1))!.innerHTML = game.question.answers[i];
          }
        }, offset);
      }
    }

    for (const existing of Object.keys(playerDiv)) {
      if (!allPlayerIds.includes(existing)) {
        playerDiv[existing].parentElement?.removeChild(playerDiv[existing]);
      }
    }

    const correctAnswerIds: PlayerId[] = [];
    for (const id of allPlayerIds) {
      if (!playerDiv[id]) {
        createPlayerDiv(id);
      }
      const statusDiv = playerDiv[id].getElementsByClassName("playerStatus").item(0) as HTMLDivElement;
      const status = game.playerStatus[id];

      statusDiv.innerHTML = status;
      statusDiv.className = "playerStatus " + game.playerStatus[id];
      const scoreDiv = playerDiv[id].getElementsByClassName("playerScore").item(0) as HTMLDivElement;
      const newScore = ""+game.playerScores[id];
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

    if (questionChanged && yourPlayerId && game.questionNumber > 1 && action?.action !== "timeDone") {
      if (correctAnswerIds.includes(yourPlayerId)) {
        play(SOUND_CORRECT);
      } else {
        play(SOUND_INCORRECT);
      }
    }

  },
})
