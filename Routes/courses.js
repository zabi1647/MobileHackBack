const express = require("express");
const { PrismaClient, ContentType } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

router.get("/courses", async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tutor: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { lessons: true }
                }
            }
        });
        res.json(courses);
    } catch (error) {
        console.error("Failed to fetch courses:", error);
        res.status(500).json({ error: "Failed to retrieve courses" });
    }
});

router.post("/courses", async (req, res) => {
    const { title, description, coverPictureUrl, tutorId } = req.body;

    if (!title || !tutorId) {
        return res.status(400).json({ error: "Course title and tutorId are required" });
    }

    try {
        const tutorExists = await prisma.tutor.findUnique({ where: { id: tutorId } });
        if (!tutorExists) {
            return res.status(404).json({ error: "Tutor not found" });
        }

        const newCourse = await prisma.course.create({
            data: {
                title,
                description: description || null,
                coverPictureUrl: coverPictureUrl || null,
                tutorId,
            },
            include: {
                 tutor: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(newCourse);
    } catch (error) {
        console.error("Failed to create course:", error);
        res.status(500).json({ error: "Failed to create course" });
    }
});

router.post("/courses/:courseId/lessons", async (req, res) => {
    const { courseId } = req.params;
    const { title, order } = req.body;

    if (!title || order === undefined) {
        return res.status(400).json({ error: "Lesson title and order are required" });
    }

    if (typeof order !== 'number' || order < 0) {
         return res.status(400).json({ error: "Order must be a non-negative number" });
    }

    try {
        const courseExists = await prisma.course.findUnique({ where: { id: courseId } });
        if (!courseExists) {
            return res.status(404).json({ error: "Course not found" });
        }

        const newLesson = await prisma.lesson.create({
            data: {
                title,
                order,
                courseId,
            }
        });
        res.status(201).json(newLesson);
    } catch (error) {
        console.error(`Failed to add lesson to course ${courseId}:`, error);
        res.status(500).json({ error: "Failed to add lesson" });
    }
});

router.post("/lessons/:lessonId/content-blocks", async (req, res) => {
    const { lessonId } = req.params;
    const { type, textValue, fileUrl, order } = req.body;

    if (!type || !Object.values(ContentType).includes(type)) {
        return res.status(400).json({ error: "Valid content type (TEXT, PDF, IMAGE) is required" });
    }

    if (type === ContentType.TEXT && !textValue) {
        return res.status(400).json({ error: "textValue is required for TEXT content type" });
    }

    if ((type === ContentType.PDF || type === ContentType.IMAGE) && !fileUrl) {
         return res.status(400).json({ error: `fileUrl is required for ${type} content type` });
    }

    if (order === undefined || typeof order !== 'number' || order < 0) {
        return res.status(400).json({ error: "A valid non-negative order is required" });
    }

    try {
        const lessonExists = await prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lessonExists) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        const newContentBlock = await prisma.contentBlock.create({
            data: {
                lessonId,
                type,
                order,
                textValue: type === ContentType.TEXT ? textValue : null,
                fileUrl: (type === ContentType.PDF || type === ContentType.IMAGE) ? fileUrl : null,
            }
        });
        res.status(201).json(newContentBlock);
    } catch (error) {
        console.error(`Failed to add content block to lesson ${lessonId}:`, error);
        res.status(500).json({ error: "Failed to add content block" });
    }
});

module.exports = router; 