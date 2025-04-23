# MobileHackBack

MobileHackBack is a backend application built with Node.js, Express, and Prisma ORM. It provides APIs for managing courses, lessons, students, tutors, and related functionalities.

## Features

- **Authentication**: Manage tutors and students, including user search by email.
- **Courses**: Create, retrieve, and manage courses and their lessons.
- **Lessons**: Manage lessons within courses, including content blocks and flashcards.
- **Enrollment**: Enroll students in courses and track their progress.
- **Flashcards**: Create flashcards for lessons.

## Project Structure

The project is organized as follows:

GitHub Copilot
Here is a README.md file for your project:

MobileHackBack/ ├── Routes/ │ ├── auth.js # Authentication and user management routes │ ├── courses.js # Course-related routes │ ├── lessons.js # Lesson-related routes │ ├── questions.js # Question-related routes ├── prisma/ # Prisma schema and migrations ├── node_modules/ # Node.js dependencies ├── package.json # Project metadata and dependencies ├── package-lock.json # Dependency lock file └── README.md # Project documentation


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MohammedAlsalehi033/MobileHackBack
   cd MobileHackBack