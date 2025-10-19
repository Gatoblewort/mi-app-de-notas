// Configuración de Firebase - TUS DATOS REALES
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class NotesApp {
    constructor() {
        this.notes = [];
        this.currentEditIndex = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadNotesFromFirebase();
        this.setupPWA();
    }

    bindEvents() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openModal());
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
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
        const modalTitle = document.getElementById('modalTitle');
        const titleInput = document.getElementById('noteTitle');
        const contentInput = document.getElementById('noteContent');

        if (editIndex !== null) {
            modalTitle.textContent = 'Editar Nota';
            const note = this.notes[editIndex];
            titleInput.value = note.title;
            contentInput.value = note.content;
        } else {
            modalTitle.textContent = 'Nueva Nota';
            titleInput.value = '';
            contentInput.value = '';
        }

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('noteModal').style.display = 'none';
        this.currentEditIndex = null;
    }

    async saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            alert('Por favor, completa tanto el título como el contenido');
            return;
        }

        const noteData = {
            title,
            content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            date: new Date().toLocaleDateString()
        };

        try {
            if (this.currentEditIndex !== null) {
                // Editar nota existente
                const noteId = this.notes[this.currentEditIndex].id;
                await db.collection('notes').doc(noteId).update(noteData);
            } else {
                // Crear nueva nota
                await db.collection('notes').add(noteData);
            }
            
            this.loadNotesFromFirebase(); // Recargar notas
            this.closeModal();
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar la nota');
        }
    }

    async deleteNote(index) {
        if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            try {
                const noteId = this.notes[index].id;
                await db.collection('notes').doc(noteId).delete();
                this.loadNotesFromFirebase(); // Recargar notas
            } catch (error) {
                console.error('Error eliminando nota:', error);
                alert('Error al eliminar la nota');
            }
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        
        if (this.notes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No hay notas aún. ¡Crea tu primera nota!</p>';
            return;
        }

        container.innerHTML = this.notes.map((note, index) => `
            <div class="note">
                <h3>${this.escapeHtml(note.title)}</h3>
                <p>${this.escapeHtml(note.content)}</p>
                <div class="note-meta">
                    <small>${note.date}</small>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" onclick="app.openModal(${index})">Editar</button>
                    <button class="delete-btn" onclick="app.deleteNote(${index})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('Service Worker registrado correctamente'))
                .catch(err => console.log('Error registrando SW:', err));
        }
    }
}

// Inicializar la aplicación
const app = new NotesApp();