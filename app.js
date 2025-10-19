// =================================================================
// Configuración de Firebase
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

// Inicialización de 'db'
let db = null; 

// Función auxiliar para formatear la fecha y hora
function formatNoteTimestamp(timestamp) {
    if (timestamp && timestamp.toDate) {
        const date = timestamp.toDate();
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('es-MX', options);
    }
    return 'Sin fecha';
}

// =================================================================
// Clase Principal de la Aplicación
// =================================================================
class NotesApp {
    constructor() {
        this.notes = [];
        this.saveBtn = document.getElementById('saveNoteBtn'); // Referencia al botón
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes(); 
    }

    setupEventListeners() {
        // ... (Mantenemos los mismos listeners)
        document.getElementById('addNoteBtn').addEventListener('click', () => {
            this.openModal();
        });

        this.saveBtn.addEventListener('click', () => {
            this.saveNote();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

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
        
        // Asegurar que el botón de guardar esté habilitado y con texto normal
        this.saveBtn.disabled = false;
        this.saveBtn.textContent = 'Guardar Nota';

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

        // 🟢 MEJORA UX: Feedback visual al guardar
        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Guardando...';

        try {
            await db.collection('notes').add({
                title: title,
                content: content,
                // Usamos la marca de tiempo del servidor para ordenar correctamente
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                // Eliminamos 'date' simple, usaremos 'timestamp' para el display
            });

            // Si fue exitoso
            this.closeModal();
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar: ' + error.message);
            // Revertir el estado del botón en caso de error
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Guardar Nota';
        }
    }

    // Método de escucha en tiempo real (onSnapshot)
    loadNotes() {
        db.collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data() 
                }));
                
                this.displayNotes();
            }, error => {
                console.error('Error al escuchar cambios en notas:', error);
            });
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
                    <small>${formatNoteTimestamp(note.timestamp)}</small>
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

// =================================================================
// INICIO DE LA APLICACIÓN
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore(); 
            
            // Refuerzo para usar ServerTimestamp
            db.settings({ timestampsInSnapshots: true });

            window.app = new NotesApp();
        } catch (error) {
            console.error("Error al inicializar Firebase o Firestore:", error);
            const container = document.getElementById('notesContainer');
            if(container) {
                 container.innerHTML = `<h2 style="color:red; text-align:center;">ERROR DE CONEXIÓN: ${error.message}</h2>`;
            }
        }
    } else {
        console.error("Firebase no está cargado. Revisa tus etiquetas <script> en index.html.");
        const container = document.getElementById('notesContainer');
        if(container) {
             container.innerHTML = '<h2 style="color:red; text-align:center;">ERROR: Las librerías de Firebase no están cargadas.</h2>';
        }
    }
});