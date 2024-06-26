import { Language } from "./logic";

export type TranslatedText = {
    letsPlay: string;
    quizTime: string;
    yes: string;
    no: string;
    howManyQuestions: string;
    question: string;
    timedQuestions: string;
}

export const TRANSLATIONS: Record<Language, TranslatedText> = {
    en: {
        letsPlay: "Lets Play!",
        quizTime: "Quiz Time!",
        yes: "Yes",
        no: "No",
        howManyQuestions: "How many questions?",
        question: "Question",
        timedQuestions: "Timed questions?",
    },
    ru: {
        letsPlay: "Давайте играть!",
        quizTime: "Время викторины!",
        yes: "Да",
        no: "Нет",
        howManyQuestions: "Сколько вопросов?",
        question: "Вопрос",
        timedQuestions: "Вопросы по времени?",
    },
    pt: {
        letsPlay: "Vamos jogar!",
        quizTime: "Hora das perguntas!",
        yes: "Sim",
        no: "Não",
        howManyQuestions: "Quantas perguntas?",
        question: "Pergunta",
        timedQuestions: "Perguntas cronometradas?",
    },
    es: {
        letsPlay: "¡Vamos a jugar!",
        quizTime: "¡Hora de las pruebas!",
        yes: "Sí",
        no: "No",
        howManyQuestions: "¿Cuántas preguntas?",
        question: "Pregunta",
        timedQuestions: "¿Preguntas cronometradas?",
    }
}