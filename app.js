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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
    }

    bindEvents() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openModal());
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadNotesFromFirebase() {
        try {
            console.log("Cargando notas desde Firebase...");
            const snapshot = await db.collection('notes').orderBy('timestamp', 'desc').get();
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Notas cargadas:", this.notes);
            this.renderNotes();
        } catch (error) {
            console.error('Error cargando notas:', error);
            alert('Error al cargar notas: ' + error.message);
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
            titleInput.value = note.title || '';
            contentInput.value = note.content || '';
        } else {
            modalTitle.textContent = 'Nueva Nota';
            titleInput.value = '';
            contentInput.value = '';
        }

        modal.style.display = 'block';
        
        // Enfocar el campo de título
        setTimeout(() => titleInput.focus(), 100);
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

        console.log("Guardando nota:", { title, content });

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
                console.log("Nota actualizada:", noteId);
            } else {
                // Crear nueva nota
                const result = await db.collection('notes').add(noteData);
                console.log("Nota creada con ID:", result.id);
            }
            
            // Recargar notas
            await this.loadNotesFromFirebase();
            this.closeModal();
            alert('Nota guardada correctamente!');
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar la nota: ' + error.message);
        }
    }

    async deleteNote(index) {
        if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            try {
                const noteId = this.notes[index].id;
                await db.collection('notes').doc(noteId).delete();
                await this.loadNotesFromFirebase();
                alert('Nota eliminada correctamente');
            } catch (error) {
                console.error('Error eliminando nota:', error);
                alert('Error al eliminar la nota: ' + error.message);
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
                    <small>${note.date || 'Sin fecha'}</small>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" onclick="app.openModal(${index})">Editar</button>
                    <button class="delete-btn" onclick="app.deleteNote(${index})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar la aplicación cuando se carga la página
const app = new NotesApp();