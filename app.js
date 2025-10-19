// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    console.log("Firebase conectado correctamente");
} catch (error) {
    console.error("Error conectando Firebase:", error);
}

class NotesApp {
    constructor() {
        this.notes = [];
        this.currentEditIndex = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadNotesFromFirebase();
    }

    bindEvents() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openModal());
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
    }

    async loadNotesFromFirebase() {
        try {
            const snapshot = await db.collection('notes').orderBy('timestamp', 'desc').get();
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.renderNotes();
        } catch (error) {
            console.error('Error cargando notas:', error);
        }
    }

    openModal(editIndex = null) {
        this.currentEditIndex = editIndex;
        const modal = document.getElementById('noteModal');
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('noteModal').style.display = 'none';
        this.currentEditIndex = null;
    }

    async saveNote() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;

        if (!title || !content) {
            alert('Completa título y contenido');
            return;
        }

        try {
            await db.collection('notes').add({
                title,
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.loadNotesFromFirebase();
            this.closeModal();
        } catch (error) {
            console.error('Error guardando:', error);
            alert('Error al guardar');
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        container.innerHTML = this.notes.map((note, index) => `
            <div class="note">
                <h3>${note.title}</h3>
                <p>${note.content}</p>
                <button onclick="app.deleteNote(${index})">Eliminar</button>
            </div>
        `).join('');
    }
}

const app = new NotesApp();