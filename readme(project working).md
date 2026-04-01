HOW TO COPY AND RUN THIS PROJECT

To copy this project from GitHub, clone the repository to your local
machine using your repository URL, then open the project folder in your
terminal or code editor. After cloning, install dependencies separately
for the backend and frontend because this project uses React on the
frontend and Express on the backend. In the backend folder, run the
package installation command, create or update the backend/.env file,
and add your Groq API key so the chatbot can return live AI responses.
In the frontend folder, install the frontend dependencies as well. Once
installation is complete, start the backend from the backend folder and
start the frontend from the frontend folder. After both servers are
running, open the frontend in your browser, usually on localhost:3000,
and the backend will run on localhost:5000.

The environment configuration file is located in backend/.env. This file
stores sensitive values such as the Groq API key used by the chatbot
service. The backend reads this key from the environment so it can
securely authenticate requests to the Groq API without exposing the
secret in frontend code. If the API key is missing or invalid, the
chatbot will not be able to return live AI responses, so the .env file
must be configured before full testing.

Smart Course Material Organizer with AI Chatbot is a full-stack web
application designed to help students upload, organize, review, and
interact with their course materials in one place. The system allows
users to manage documents such as PDFs and other study files, view or
download them directly from the browser, and use an integrated AI
chatbot to ask study-related questions. The chatbot can also work with
uploaded PDF documents, making it useful for summarizing notes,
explaining topics, and answering questions based on document content.

The project uses React for the frontend user interface and Node.js with
Express for the backend server. Data about uploaded files is stored in
JSON format inside backend/data/materials.json, which acts as a
lightweight local data store for file metadata. Uploaded files
themselves are saved on the local filesystem in backend/uploads. The
chatbot uses the Groq API with a Llama 3 model to generate AI
responses, and PDF text extraction is handled with pdf-parse so the
system can read the content of uploaded PDF files before sending
relevant context to the AI model.

The system works by connecting the frontend and backend through API
requests. The React frontend provides the user interface for uploading
files, viewing stored materials, managing file details, and chatting
with the AI assistant. When a user performs an action such as uploading
a file, fetching material data, deleting a record, or sending a chat
prompt, the frontend sends a request to the Express backend. The backend
processes that request, interacts with local storage or external AI
services when needed, and then returns a response to the frontend so the
interface can update in real time.

The file upload system allows users to select or drag supported files
into the application. Once a file is uploaded, the backend stores the
physical file in backend/uploads and saves its related metadata in
backend/data/materials.json. This metadata can include information such
as the file name, course, topic, semester, tags, description, status,
and other supporting fields used by the app. Users can later browse
these materials through the interface, open supported files in the
browser, download them, or delete them when they are no longer needed.

The chatbot is integrated into the right side of the application
interface and is connected to the backend through the POST /api/chat
endpoint. When a user enters a question, the frontend sends the message
to the backend as JSON. If the user has attached a PDF file to the chat,
the request can also include a file reference so the backend knows which
document to use as context. The backend then prepares the prompt, sends
it to the Groq API using the configured API key, receives the generated
response from the Llama 3 model, and returns that reply to the frontend,
where it is shown in the chat panel.

PDF processing is an important part of the chatbot workflow. When a PDF
is uploaded for chat use, the backend reads the file from disk and
extracts its text content using pdf-parse. That extracted text is stored
with the file record so it can be reused during chat without needing to
parse the same document repeatedly. To keep requests efficient and avoid
excessively large prompts, only a limited portion of the extracted text
is typically sent to the AI model. If a PDF does not contain readable
text, such as a scanned image-only document, the backend can return a
meaningful message explaining that text could not be extracted.

To run the project locally after setup, the backend should be started
first from the backend folder, and the frontend should then be started
from the frontend folder. The backend runs the Express server, handles
file storage, reads and writes the materials JSON file, and manages AI
chat requests. The frontend runs the React development server and
provides the browser-based interface for users. Once both servers are
running, users can open the frontend in the browser and interact with
the complete system.

Users interact with the app by uploading course materials, browsing
their saved files, viewing or downloading documents, and using the
built-in AI assistant to ask questions. They can upload PDFs and other
supported files, manage metadata associated with each material, and
attach PDFs to the chatbot for document-based question answering. This
makes the application useful not only as a file organizer but also as a
study assistant that can help interpret, summarize, and explain
academic content directly from uploaded learning materials.
