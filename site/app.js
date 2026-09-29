const experience = document.querySelector("#experience");
const sceneContent = document.querySelector("#scene-content");
const sceneLabel = document.querySelector("#scene-label");
const progressCopy = document.querySelector("#progress-copy");
const progressCount = document.querySelector("#progress-count");
const progressFill = document.querySelector("#progress-fill");
const backgroundMusic = document.querySelector("#background-music");
const fahSound = document.querySelector("#fah-sound");
const donkMusic = document.querySelector("#donk-music");

let currentQuestion = 1;
let loopMusicEnabled = true;
const PROGRESS_STEPS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 7, 9: 8 };
const AVAILABLE_DATE_VALUES = [
  "2026-07-30",
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
];

const questions = {
  1: {
    eyebrow: "Your invitation",
    title: "Let's schedule a date!",
    description: "Be a good girl & answer all the questions. I'll worry about the rest.",
    image: "images/1.png",
    choices: [
      { value: "yes", label: "Yes", primary: true },
      { value: "yes_of_course", label: "Yes, Of course" },
    ],
  },
  2: {
    eyebrow: "A little question",
    title: "Do you like Ali?!?!",
    description: "Afterall, he's really handsome ngl.",
    image: "images/2.png",
    negativeImage: "images/2-no.png",
    choices: [
      { value: "sure", label: "Sure!", primary: true },
      { value: "not_really", label: "Not really." },
    ],
  },
  3: {
    eyebrow: "Your turn",
    title: "How do you like it?",
    description: "I guess your opinion matters...",
    image: "images/3.png",
    choices: [
      { value: "dinner_chill", label: "Dinner & Chill", primary: true },
      { value: "coffee_walking", label: "Coffee & Walking" },
    ],
    acceptsCustomAnswer: true,
  },
  4: {
    eyebrow: "Pick a day",
    title: "When should we go?",
    description: "Your handsome date is only available on Thursday this week. But next week, any day in the week you like!",
    image: "images/4.png",
    acceptsDate: true,
  },
  5: {
    eyebrow: "A quick detour",
    title: "So you know HSE, huh?",
    description: "Answer the following questions. They should be easy, I swear to god!",
    image: "images/1.png",
    startsHseQuiz: true,
  },
  8: {
    eyebrow: "One last thing",
    title: "Upload a selfie, RIGHT NOW!",
    description: "Ali demands a selfie from you right now. Upload it or you'll die painfully.",
    image: "images/5.png",
    acceptsUpload: true,
  },
  9: {
    eyebrow: "The final question",
    title: "What if...?",
    description: "What if Ali couldn't handle your cuteness and decided to kiss you on first date...",
    image: "images/6.png",
    choices: [
      { value: "kiss_back", label: "I might kiss him back!", primary: true },
      { value: "kiss_cheek", label: "Sure but only on cheek \u{1F62D}" },
      { value: "kiss_later", label: "He'll get his kiss but later." },
    ],
  },
};

function startMusic() {
  if (!loopMusicEnabled) return;
  backgroundMusic.play().catch(() => {
    // Browsers may require a user gesture before they allow sound to play.
  });
}

function playFahSound() {
  fahSound.currentTime = 0;
  fahSound.play().catch(() => {
    // The same user click that chose the answer normally permits this sound.
  });
}

function isAvailableDate(value) {
  return AVAILABLE_DATE_VALUES.includes(value);
}

function dateOptionLabel(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function setProgress(questionNumber) {
  const step = PROGRESS_STEPS[questionNumber];
  sceneLabel.textContent = `Scene ${String(step).padStart(2, "0")}`;
  progressCopy.textContent = step === 1 ? "A tiny question" : "Keep going";
  progressCount.textContent = `${String(step).padStart(2, "0")} / 08`;
  progressFill.style.width = `${step * (100 / 8)}%`;
}

function choiceMarkup(choice) {
  const buttonClass = choice.primary ? "" : "secondary";
  const arrow = choice.primary ? "&#8599;" : "&#8594;";
  return `
    <button type="button" data-choice="${choice.value}" class="${buttonClass}">
      <span>${choice.label}</span>
      <span class="button-arrow" aria-hidden="true">${arrow}</span>
    </button>
  `;
}

function customAnswerMarkup(question) {
  if (!question.acceptsCustomAnswer) return "";
  return `
    <form class="custom-answer" id="custom-answer">
      <label class="sr-only" for="custom-answer-input">Your answer</label>
      <input id="custom-answer-input" name="custom-answer" type="text" maxlength="240" autocomplete="off" placeholder="Or tell me your idea..." required>
      <button type="submit" class="send-answer"><span>Send</span><span class="button-arrow" aria-hidden="true">&#8599;</span></button>
    </form>
  `;
}

function dateAnswerMarkup(question) {
  if (!question.acceptsDate) return "";
  return `
    <form class="date-answer" id="date-answer">
      <label for="date-answer-input">Choose your date</label>
      <div class="date-controls">
        <select id="date-answer-input" name="date-answer" required>
          <option value="">Select a date</option>
          ${AVAILABLE_DATE_VALUES.map((value) => `<option value="${value}">${dateOptionLabel(value)}</option>`).join("")}
        </select>
        <button type="submit" class="send-answer"><span>Send</span><span class="button-arrow" aria-hidden="true">&#8599;</span></button>
      </div>
      <p class="date-help">Available: July 30 and August 1–7, 2026.</p>
    </form>
  `;
}

function uploadAnswerMarkup(question) {
  if (!question.acceptsUpload) return "";
  return `
    <form class="upload-answer" id="upload-answer">
      <label for="selfie-input">Choose a photo</label>
      <div class="upload-controls">
        <input id="selfie-input" name="photo" type="file" accept="image/png,image/jpeg,image/webp" required>
        <button type="button" class="secondary" data-upload disabled><span>Upload photo</span><span class="button-arrow" aria-hidden="true">&#8599;</span></button>
      </div>
      <button type="submit" class="send-answer upload-submit" disabled><span>Submit</span><span class="button-arrow" aria-hidden="true">&#8599;</span></button>
      <p class="upload-help">PNG, JPEG, or WebP up to 5 MiB.</p>
    </form>
  `;
}

function hseStartMarkup(question) {
  if (!question.startsHseQuiz) return "";
  return '<button type="button" class="next-button" data-hse-start><span>Next</span><span class="button-arrow" aria-hidden="true">&#8594;</span></button>';
}

const HSE_QUESTIONS = [
  {
    prompt: "During a confined space entry, the oxygen concentration is measured at 18.5%. What is the correct action?",
    answers: [
      ["A", "Enter if wearing a dust mask."],
      ["B", "Enter only if the work will take less than 10 minutes."],
      ["C", "Do not enter until the atmosphere is made safe and an approved entry procedure is followed."],
      ["D", "Enter if two workers go in together."],
    ],
  },
  {
    prompt: "Which control measure is considered more effective than administrative controls according to the Hierarchy of Controls?",
    answers: [
      ["A", "Safety training."],
      ["B", "Warning signs."],
      ["C", "Engineering controls."],
      ["D", "Safe work procedures."],
    ],
  },
  {
    prompt: "A worker is using a grinder and the wheel has a small visible crack. What is the safest action?",
    answers: [
      ["A", "Use it at low speed."],
      ["B", "Continue using it if eye protection is worn."],
      ["C", "Replace the grinding wheel before use."],
      ["D", "Ask another worker if it is safe."],
    ],
  },
  {
    prompt: "A chemical has a flash point of 18°C (64°F). What does this indicate?",
    answers: [
      ["A", "It cannot ignite below 18°C."],
      ["B", "It can produce enough vapor to ignite at temperatures around or above 18°C."],
      ["C", "It will automatically catch fire at 18°C."],
      ["D", "It is non-flammable."],
    ],
  },
];

function renderHseQuiz() {
  clearPrayCelebration();
  currentQuestion = 6;
  sceneLabel.textContent = "Quick quiz";
  progressCopy.textContent = "Show me what you know";
  progressCount.textContent = "06 / 08";
  progressFill.style.width = "75%";
  experience.classList.remove("is-complete");
  sceneContent.innerHTML = `
    <form class="hse-quiz" id="hse-quiz">
      ${HSE_QUESTIONS.map((question, index) => `
        <fieldset class="hse-question">
          <legend><span>${index + 1}.</span> ${question.prompt}</legend>
          <div class="hse-answers">
            ${question.answers.map(([value, label]) => `
              <label><input type="radio" name="q${index + 1}" value="${value}" required><span class="hse-answer-letter">${value}</span><span>${label}</span></label>
            `).join("")}
          </div>
        </fieldset>
      `).join("")}
      <button type="submit" class="hse-submit"><span>Submit answers</span><span class="button-arrow" aria-hidden="true">&#8599;</span></button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `;
}

function renderHseScore(score) {
  currentQuestion = 7;
  experience.classList.add("is-complete");
  sceneLabel.textContent = "Results";
  progressCopy.textContent = "HSE complete";
  progressCount.textContent = "06 / 08";
  progressFill.style.width = "75%";
  const title = score >= 3
    ? "You are truly amazing :)"
    : score === 2
      ? "Good job cutie!"
      : "I'm gonna pretend I didn't see the score.";
  sceneContent.innerHTML = `
    <div class="hse-score">
      <p class="eyebrow"><span aria-hidden="true">&#10022;</span> Your result</p>
      <p class="hse-score-value">${score} <span>/ 4</span></p>
      <h1 id="page-title">${title}</h1>
      <button type="button" class="next-button" data-hse-finish><span>Back to the date</span><span class="button-arrow" aria-hidden="true">&#8594;</span></button>
    </div>
  `;
}

function renderQuestion(questionNumber, showNegativeImage = false) {
  clearPrayCelebration();
  const question = questions[questionNumber];
  currentQuestion = questionNumber;
  experience.classList.remove("is-complete");
  setProgress(questionNumber);
  const image = showNegativeImage ? question.negativeImage : question.image;
  const choices = question.choices ? `<div class="choices">${question.choices.map(choiceMarkup).join("")}</div>` : "";

  sceneContent.innerHTML = `
    <div class="scene-layout">
      <figure class="scene-visual">
        ${image ? `<img src="${image}" alt="Illustration for question ${questionNumber}">` : `<span class="scene-symbol" aria-hidden="true">?</span>`}
      </figure>
      <div class="scene-copy">
        <p class="eyebrow"><span aria-hidden="true">&#10022;</span> ${question.eyebrow}</p>
        <h1 id="page-title">${question.title}</h1>
        <p class="intro">${question.description}</p>
        <div class="choice-form">
          ${choices}
          ${customAnswerMarkup(question)}
          ${dateAnswerMarkup(question)}
          ${uploadAnswerMarkup(question)}
          ${hseStartMarkup(question)}
          <p class="form-message" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;
}

function renderOutcomeSlide(outcome) {
  clearPrayCelebration();
  currentQuestion = 7;
  sceneLabel.textContent = "A little moment";
  progressCopy.textContent = "All yours";
  progressCount.textContent = "Done";
  progressFill.style.width = "100%";
  experience.classList.add("is-complete");
  const isKissBack = outcome === "kiss_back" || outcome === "kiss_cheek";
  const title = isKissBack ? "I USED TO PRAY FOR TIMES LIKE THIS" : "Pfff fine. I had to try it anyway";
  const description = isKissBack ? "" : "But I will be holding your hands, no questions asked!";
  const image = isKissBack ? "images/yes.png" : "images/no.png";
  sceneContent.innerHTML = `
    <div class="scene-layout outcome-layout">
      <figure class="scene-visual"><img src="${image}" alt="Final response illustration"></figure>
      <div class="scene-copy">
        <p class="eyebrow"><span aria-hidden="true">&#10022;</span> A little moment</p>
        <h1 id="page-title">${title}</h1>
        ${description ? `<p class="intro">${description}</p>` : ""}
        <button type="button" class="next-button" data-next><span>Next</span><span class="button-arrow" aria-hidden="true">&#8594;</span></button>
      </div>
    </div>
  `;
  if (isKissBack) addPrayCelebration();
}

function renderFinalSlide() {
  clearPrayCelebration();
  currentQuestion = 8;
  sceneLabel.textContent = "Done";
  progressCopy.textContent = "See you soon";
  progressCount.textContent = "Complete";
  progressFill.style.width = "100%";
  sceneContent.innerHTML = `
    <div class="scene-layout outcome-layout">
      <figure class="scene-visual"><img src="images/final.png" alt="Final illustration"></figure>
      <div class="scene-copy">
        <p class="eyebrow"><span aria-hidden="true">&#10022;</span> It is done</p>
        <h1 id="page-title">It is done!</h1>
        <p class="intro">Your handsome date will keep in touch. Now close this page so I can shutdown my server ffs.</p>
      </div>
    </div>
  `;
}

function clearPrayCelebration() {
  document.querySelector(".pray-celebration")?.remove();
}

function addPrayCelebration() {
  const celebration = document.createElement("div");
  celebration.className = "pray-celebration";
  celebration.setAttribute("aria-hidden", "true");
  celebration.innerHTML = Array.from(
    { length: 6 },
    () => '<img src="images/pray.jpg" alt="">',
  ).join("");
  document.body.append(celebration);
}

function transitionTo(renderNextScene) {
  experience.classList.add("is-transitioning");
  window.setTimeout(() => {
    renderNextScene();
    experience.classList.remove("is-transitioning");
  }, 320);
}

async function saveChoice(choice, messageElement, detail = null) {
  messageElement.textContent = "Saving your answer...";
  const payload = { choice };
  if (choice === "custom") payload.text = detail;
  if (choice === "date") payload.date = detail;
  if (choice === "selfie_uploaded") payload.file = detail;
  const response = await fetch("/api/selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Request failed");
}

function setControlsDisabled(buttons, input, isDisabled) {
  buttons.forEach((button) => { button.disabled = isDisabled; });
  if (input) input.disabled = isDisabled;
}

async function handleChoice(choice, buttons, messageElement, input = null, detail = null) {
  const answerDetail = choice === "custom" ? input.value.trim() : detail;
  setControlsDisabled(buttons, input, true);

  if (currentQuestion === 2 && choice === "not_really") {
    loopMusicEnabled = false;
    backgroundMusic.pause();
    playFahSound();
  }
  if (currentQuestion === 9 && (choice === "kiss_back" || choice === "kiss_cheek")) {
    loopMusicEnabled = false;
    backgroundMusic.pause();
    donkMusic.currentTime = 0;
    donkMusic.play().catch(() => {
      // Browser gesture policy may delay audio until the next interaction.
    });
  }

  try {
    await saveChoice(choice, messageElement, answerDetail);
    if (currentQuestion === 1) return transitionTo(() => renderQuestion(2));
    if (currentQuestion === 2 && choice === "not_really") return renderQuestion(2, true);
    if (currentQuestion === 2 && choice === "sure") {
      loopMusicEnabled = true;
      startMusic();
      return transitionTo(() => renderQuestion(3));
    }
    if (currentQuestion === 3) return transitionTo(() => renderQuestion(4));
    if (currentQuestion === 4) return transitionTo(() => renderQuestion(5));
    if (currentQuestion === 8) return transitionTo(() => renderQuestion(9));
    if (currentQuestion === 9) {
      transitionTo(() => renderOutcomeSlide(choice));
    }
  } catch {
    messageElement.textContent = "That did not save. Please try once more.";
    setControlsDisabled(buttons, input, false);
  }
}

sceneContent.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-choice]");
  if (!button || button.disabled) return;
  void handleChoice(button.dataset.choice, sceneContent.querySelectorAll("button"), sceneContent.querySelector(".form-message"));
});

sceneContent.addEventListener("submit", (event) => {
  event.preventDefault();
  const messageElement = sceneContent.querySelector(".form-message");
  if (event.target.matches("#custom-answer")) {
    const input = event.target.querySelector("#custom-answer-input");
    if (!input.value.trim()) {
      messageElement.textContent = "Tell me your idea first.";
      input.focus();
      return;
    }
    void handleChoice("custom", sceneContent.querySelectorAll("button"), messageElement, input);
  }
  if (event.target.matches("#date-answer")) {
    const input = event.target.querySelector("#date-answer-input");
    if (!input.value || !isAvailableDate(input.value)) {
      messageElement.textContent = "Choose one of the available dates.";
      input.focus();
      return;
    }
    void handleChoice("date", sceneContent.querySelectorAll("button"), messageElement, input, input.value);
  }
  if (event.target.matches("#upload-answer")) {
    const filename = event.target.dataset.uploadFilename;
    if (!filename) {
      messageElement.textContent = "Upload your photo before submitting.";
      return;
    }
    void handleChoice("selfie_uploaded", sceneContent.querySelectorAll("button"), messageElement, null, filename);
  }
  if (event.target.matches("#hse-quiz")) {
    const form = event.target;
    const answers = Object.fromEntries(new FormData(form).entries());
    const messageElement = form.querySelector(".form-message");
    if (Object.keys(answers).length !== 4) {
      messageElement.textContent = "Answer every question first.";
      return;
    }
    void submitHseQuiz(form, answers, messageElement);
  }
});

async function submitHseQuiz(form, answers, messageElement) {
  const submitButton = form.querySelector("button[type=submit]");
  submitButton.disabled = true;
  messageElement.textContent = "Checking your answers...";
  try {
    const response = await fetch("/api/hse-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok || !Number.isInteger(payload.score)) throw new Error("Quiz save failed");
    transitionTo(() => renderHseScore(payload.score));
  } catch {
    submitButton.disabled = false;
    messageElement.textContent = "That did not save. Please try again.";
  }
}

sceneContent.addEventListener("change", (event) => {
  if (!event.target.matches("#selfie-input")) return;
  const form = event.target.closest("#upload-answer");
  const uploadButton = form.querySelector("[data-upload]");
  const submitButton = form.querySelector(".upload-submit");
  form.dataset.uploadFilename = "";
  uploadButton.disabled = event.target.files.length !== 1;
  submitButton.disabled = true;
});

sceneContent.addEventListener("click", async (event) => {
  const uploadButton = event.target.closest("[data-upload]");
  if (!uploadButton || uploadButton.disabled) return;
  const form = uploadButton.closest("#upload-answer");
  const input = form.querySelector("#selfie-input");
  const messageElement = sceneContent.querySelector(".form-message");
  const submitButton = form.querySelector(".upload-submit");
  if (input.files.length !== 1) return;

  uploadButton.disabled = true;
  input.disabled = true;
  messageElement.textContent = "Uploading your photo...";
  try {
    const formData = new FormData();
    formData.append("photo", input.files[0]);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.filename) throw new Error("Upload failed");
    form.dataset.uploadFilename = payload.filename;
    submitButton.disabled = false;
    messageElement.textContent = "Photo uploaded. You can submit it now.";
  } catch {
    input.disabled = false;
    uploadButton.disabled = false;
    messageElement.textContent = "That upload did not work. Try a PNG, JPEG, or WebP under 5 MiB.";
  }
});

sceneContent.addEventListener("click", (event) => {
  const hseStartButton = event.target.closest("button[data-hse-start]");
  if (hseStartButton) return transitionTo(renderHseQuiz);
  const hseFinishButton = event.target.closest("button[data-hse-finish]");
  if (hseFinishButton) return transitionTo(() => renderQuestion(8));
  const nextButton = event.target.closest("button[data-next]");
  if (nextButton) renderFinalSlide();
});

startMusic();
document.addEventListener("pointerdown", startMusic, { once: true });
document.addEventListener("keydown", startMusic, { once: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) startMusic();
});

renderQuestion(1);
