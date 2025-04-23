const express = require("express");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const [id, role] = token.split(':');
        if (id && (role === 'student' || role === 'tutor')) {
            req.user = { id, role };
            return next();
        }
    }
    req.user = null;
    next();
};

router.get("/questions", async (req, res) => {
    const { lessonId } = req.query;
    if (!lessonId) {
        return res.status(400).json({ error: "lessonId query parameter is required" });
    }
    try {
        const questions = await prisma.question.findMany({
            where: { courseId: lessonId },
            orderBy: { createdAt: 'asc' },
            include: {
                student: { select: { id: true, name: true } },
                _count: { select: { answers: true } }
            }
        });
        res.json(questions);
    } catch (error) {
        console.error(`Failed to fetch questions for lesson ${lessonId}:`, error);
        res.status(500).json({ error: "Failed to retrieve questions" });
    }
});

router.get("/questions/:questionId/answers", async (req, res) => {
    const { questionId } = req.params;
    try {
        const questionExists = await prisma.question.findUnique({ where: { id: questionId }});
        if (!questionExists) {
            return res.status(404).json({ error: "Question not found" });
        }
        const answers = await prisma.answer.findMany({
            where: { questionId: questionId },
            orderBy: { createdAt: 'asc' },
            include: {
                student: { select: { id: true, name: true } },
                tutor: { select: { id: true, name: true } }
            }
        });
        res.json(answers);
    } catch (error) {
        console.error(`Failed to fetch answers for question ${questionId}:`, error);
        res.status(500).json({ error: "Failed to retrieve answers" });
    }
});

router.post("/lessons/:lessonId/questions", authenticateUser, async (req, res) => {
    const { lessonId } = req.params;
    const { title, body } = req.body;

    if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ error: "Forbidden: Only students can post questions." });
    }
    const studentId = req.user.id;

    if (!body) {
        return res.status(400).json({ error: "Question body is required" });
    }

    try {
        const lessonExists = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true }});
        if (!lessonExists) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        const existingQuestion = await prisma.question.findFirst({
            where: {
                lessonId: lessonId,
                studentId: studentId
            }
        });
        if (existingQuestion) {
            return res.status(409).json({ error: "You have already posted a question for this lesson." });
        }

        const newQuestion = await prisma.question.create({
            data: {
                title: title || null,
                body,
                lessonId,
                studentId,
            },
            include: {
                 student: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error(`Student ${studentId} failed to post question for lesson ${lessonId}:`, error);
        res.status(500).json({ error: "Failed to post question" });
    }
});

router.post("/questions/:questionId/answers", authenticateUser, async (req, res) => {
    const { questionId } = req.params;
    const { body } = req.body;

     if (!req.user) {
        return res.status(401).json({ error: "Authentication required to post an answer." });
    }
    const authorId = req.user.id;
    const authorRole = req.user.role;

    if (!body) {
        return res.status(400).json({ error: "Answer body is required" });
    }

    try {
        const questionExists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
        if (!questionExists) {
            return res.status(404).json({ error: "Question not found" });
        }

        const answerData = {
            body,
            questionId,
            studentId: authorRole === 'student' ? authorId : null,
            tutorId: authorRole === 'tutor' ? authorId : null,
        };

        const newAnswer = await prisma.answer.create({
            data: answerData,
             include: {
                student: { select: { id: true, name: true } },
                tutor: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(newAnswer);
    } catch (error) {
        console.error(`User ${authorId} (${authorRole}) failed to post answer for question ${questionId}:`, error);
        res.status(500).json({ error: "Failed to post answer" });
    }
});

module.exports = router;