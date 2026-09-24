\# MockMate



\## AI-Powered Mock Interview Platform



MockMate is a full-stack web application designed to help students and job seekers practice technical and HR interviews through AI-generated questions, interview evaluation, personalized feedback, and interview history.



\## Features



\- User registration and login

\- JWT-based authentication

\- Technical and HR mock interviews

\- Role and difficulty-based interview practice

\- AI-generated interview questions

\- AI-based interview evaluation and feedback

\- Interview scoring and results

\- Interview history stored in MongoDB

\- Personalized feedback based on interview performance

\- Responsive web interface

\- Fallback questions when the AI service is unavailable



\## Tech Stack



\### Frontend

\- HTML5

\- CSS3

\- JavaScript

\- Bootstrap



\### Backend

\- Node.js

\- Express.js

\- MongoDB

\- Mongoose

\- JWT

\- bcrypt.js

\- Google Gemini API



\### Deployment

\- Frontend: Vercel

\- Backend: Render

\- Database: MongoDB



\## Project Structure



```text

MockMate/

├── frontend/

│   ├── index.html

│   ├── dashboard.html

│   ├── interview.html

│   ├── result.html

│   ├── signup.html

│   ├── script.js

│   └── style.css

│

├── backend/

│   ├── src/

│   │   ├── config/

│   │   ├── middleware/

│   │   ├── models/

│   │   ├── routes/

│   │   ├── services/

│   │   └── server.js

│   ├── package.json

│   └── .env.example

│

├── .gitignore

└── README.md

