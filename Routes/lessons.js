const express = require("express");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// GET /lessons?courseId=... - Get all lessons for a course
router.get("/lessons", async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) {
        return res.status(400).json({ error: "courseId query parameter is required" });
    }
    try {
        const courseExists = await prisma.course.findUnique({
            where: { id: courseId }, select: { id: true }
        });
        if (!courseExists) {
            return res.status(404).json({ error: "Course not found" });
        }
        const lessons = await prisma.lesson.findMany({
            where: { courseId: courseId },
            orderBy: { order: 'asc' },
            include: { contentBlocks: { orderBy: { order: 'asc' } } }
        });
        res.json(lessons);
    } catch (error) {
        console.error(`Failed to fetch lessons for course ${courseId}:`, error);
        res.status(500).json({ error: "Failed to retrieve lessons" });
    }
});

// POST /courses/:courseId/lessons - Create a lesson in a course
router.post("/courses/:courseId/lessons", async (req, res) => {
    // Assuming tutor verification/authorization happens elsewhere if needed
    const { courseId } = req.params;
    const { title, order } = req.body;
    if (!title || order === undefined) {
        return res.status(400).json({ error: "Lesson title and order are required" });
    }
    if (typeof order !== 'number' || order < 0) {
         return res.status(400).json({ error: "Order must be a non-negative number" });
    }
    try {
        const courseExists = await prisma.course.findUnique({
            where: { id: courseId }, select: { id: true }
        });
        if (!courseExists) {
            return res.status(404).json({ error: "Course not found" });
        }
        const newLesson = await prisma.lesson.create({
            data: { title, order, courseId }
        });
        res.status(201).json(newLesson);
    } catch (error) {
        console.error(`Failed to add lesson to course ${courseId}:`, error);
        res.status(500).json({ error: "Failed to add lesson" });
    }
});

// POST /courses/:courseId/enroll - Enroll a student (studentId from body)
router.post("/courses/:courseId/enroll", async (req, res) => {
    const { courseId } = req.params;
    const { studentId } = req.body; // Get studentId from request body

    if (!studentId) {
         return res.status(400).json({ error: "studentId is required in the request body." });
    }

    try {
        const studentExists = await prisma.student.findUnique({where: { id: studentId }, select: {id: true}});
        if (!studentExists) {
            return res.status(404).json({ error: "Student not found" });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { lessons: { select: { id: true }}}
        });
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.lessons.length === 0) {
            return res.status(400).json({ error: "Cannot enroll in a course with no lessons." });
        }

        const firstLessonId = course.lessons[0].id;
        const existingProgress = await prisma.studentLessonProgress.findUnique({
             where: { studentId_lessonId: { studentId: studentId, lessonId: firstLessonId } }
        });

        if (existingProgress) {
            return res.status(409).json({ error: "Student already enrolled in this course." });
        }

        const progressData = course.lessons.map(lesson => ({
            studentId: studentId,
            lessonId: lesson.id,
            completed: false
        }));

        await prisma.studentLessonProgress.createMany({
            data: progressData,
            skipDuplicates: true
        });

        res.status(201).json({ message: "Successfully enrolled in course." });

    } catch (error) {
        console.error(`Student ${studentId} failed to enroll in course ${courseId}:`, error);
        res.status(500).json({ error: "Failed to enroll in course" });
    }
});

router.put("/lessons/:lessonId/progress", async (req, res) => {
    const { lessonId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
         return res.status(400).json({ error: "studentId is required in the request body." });
    }

    try {
        const studentExists = await prisma.student.findUnique({where: { id: studentId }, select: {id: true}});
        const lessonExists = await prisma.lesson.findUnique({where: { id: lessonId }, select: {id: true}});
        if (!studentExists) return res.status(404).json({ error: "Student not found" });
        if (!lessonExists) return res.status(404).json({ error: "Lesson not found" });


        const updatedProgress = await prisma.studentLessonProgress.update({
            where: {
                studentId_lessonId: {
                     studentId: studentId,
                     lessonId: lessonId
                 }
            },
            data: {
                completed: true,
                completedAt: new Date()
            }
        });

        res.json(updatedProgress);

    } catch (error) {
         if (error.code === 'P2025' || error.code === 'P2016') {
            return res.status(404).json({ error: "Lesson progress not found for this student and lesson. Ensure student is enrolled." });
        }
        console.error(`Student ${studentId} failed to mark lesson ${lessonId} as done:`, error);
        res.status(500).json({ error: "Failed to update lesson progress" });
    }
});

// POST /lessons/:lessonId/flashcards - Create a flashcard (studentId from body)
router.post("/lessons/:lessonId/flashcards", async (req, res) => {
    const { lessonId } = req.params;
    const { front, back, studentId } = req.body; // Get studentId from request body

    if (!studentId) {
         return res.status(400).json({ error: "studentId is required in the request body." });
    }
    if (!front || !back) {
        return res.status(400).json({ error: "Flashcard front and back content are required." });
    }

    try {
        const studentExists = await prisma.student.findUnique({where: { id: studentId }, select: {id: true}});
        if (!studentExists) {
            return res.status(404).json({ error: "Student not found" });
        }

        const lessonExists = await prisma.lesson.findUnique({
             where: { id: lessonId }, select: { id: true }
        });
        if (!lessonExists) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        const newFlashcard = await prisma.flashcard.create({
            data: {
                front,
                back,
                studentId,
                lessonIdForStudent: lessonId,
                isAiGenerated: false
            }
        });
        res.status(201).json(newFlashcard);
    } catch (error) {
        console.error(`Student ${studentId} failed to create flashcard for lesson ${lessonId}:`, error);
        res.status(500).json({ error: "Failed to create flashcard" });
    }
});

module.exports = router;