// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

// Inicializar Firebase de forma segura
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
} else {
    console.error("Firebase no está cargado");
}

class NotesApp {
    constructor() {
        this.notes = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes();
    }

    setupEventListeners() {
        // Botón nueva nota
        document.getElementById('addNoteBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Botón guardar nota
        document.getElementById('saveNoteBtn').addEventListener('click', () => {
            this.saveNote();
        });

        // Cerrar modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    openModal() {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'block';
        
        // Limpiar campos
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        
        // Enfocar el título
        setTimeout(() => {
            document.getElementById('noteTitle').focus();
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'none';
    }

    async saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            alert('Por favor, escribe un título y contenido');
            return;
        }

        try {
            // Guardar en Firebase
            await db.collection('notes').add({
                title: title,
                content: content,
                timestamp: new Date(),
                date: new Date().toLocaleDateString('es-MX')
            });

            // Cerrar modal y recargar notas
            this.closeModal();
            this.loadNotes();
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar: ' + error.message);
        }
    }

    async loadNotes() {
        try {
            const snapshot = await db.collection('notes')
                .orderBy('timestamp', 'desc')
                .get();
            
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.displayNotes();
        } catch (error) {
            console.error('Error cargando notas:', error);
        }
    }

    displayNotes() {
        const container = document.getElementById('notesContainer');
        
        if (this.notes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay notas aún. ¡Crea tu primera nota!</p>';
            return;
        }

        container.innerHTML = this.notes.map(note => `
            <div class="note">
                <h3>${this.escapeHtml(note.title)}</h3>
                <p>${this.escapeHtml(note.content)}</p>
                <div class="note-meta">
                    <small>${note.date || 'Hoy'}</small>
                </div>
                <div class="note-actions">
                    <button class="delete-btn" onclick="app.deleteNote('${note.id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async deleteNote(noteId) {
        if (confirm('¿Eliminar esta nota?')) {
            try {
                await db.collection('notes').doc(noteId).delete();
                this.loadNotes();
            } catch (error) {
                alert('Error eliminando nota: ' + error.message);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Iniciar la app cuando se cargue la página
document.addEventListener('DOMContentLoaded', function() {
    window.app = new NotesApp();
});