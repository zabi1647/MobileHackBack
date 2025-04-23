const express = require("express");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// --- Tutor Routes ---

router.post("/tutors", async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }
    try {
        const existingTutor = await prisma.tutor.findUnique({ where: { email: email } });
        if (existingTutor) {
            return res.status(409).json({ error: "Email already in use by a tutor" });
        }
        const newTutor = await prisma.tutor.create({
            data: { name, email }
        });
        res.status(201).json(newTutor);
    } catch (error) {
        console.error("Failed to create tutor:", error);
        res.status(500).json({ error: "Failed to create tutor" });
    }
});

router.get("/tutors/:tutorId", async (req, res) => {
    const { tutorId } = req.params;
    try {
        const tutor = await prisma.tutor.findUnique({
            where: { id: tutorId }
        });
        if (!tutor) {
            return res.status(404).json({ error: "Tutor not found" });
        }
        res.json(tutor);
    } catch (error) {
        console.error(`Failed to fetch tutor ${tutorId}:`, error);
        res.status(500).json({ error: "Failed to retrieve tutor" });
    }
});


router.post("/students", async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }
    try {
        const existingStudent = await prisma.student.findUnique({ where: { email: email } });
        if (existingStudent) {
            return res.status(409).json({ error: "Email already in use by a student" });
        }
        const newStudent = await prisma.student.create({
            data: { name, email }
        });
        res.status(201).json(newStudent);
    } catch (error) {
        console.error("Failed to create student:", error);
        res.status(500).json({ error: "Failed to create student" });
    }
});

router.get("/students/:studentId", async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(student);
    } catch (error) {
        console.error(`Failed to fetch student ${studentId}:`, error);
        res.status(500).json({ error: "Failed to retrieve student" });
    }
});

// --- User Search Route ---

router.get("/users/search", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email query parameter is required" });
    }

    try {
        const tutor = await prisma.tutor.findUnique({
            where: { email: email }
        });

        if (tutor) {
            return res.json({ ...tutor, role: "tutor" });
        }

        const student = await prisma.student.findUnique({
            where: { email: email }
        });

        if (student) {
            return res.json({ ...student, role: "student" });
        }

        return res.status(404).json({ error: "User not found with that email" });

    } catch (error) {
        console.error(`Failed to search for user with email ${email}:`, error);
        res.status(500).json({ error: "Failed to perform user search" });
    }
});


module.exports = router;