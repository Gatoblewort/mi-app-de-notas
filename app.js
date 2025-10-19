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

// Inicialización de 'db' con un valor por defecto
let db = null; 

// =================================================================
// Clase Principal de la Aplicación
// =================================================================
class NotesApp {
    constructor() {
        this.notes = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Llamamos al método de escucha en tiempo real
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
                // Usamos la marca de tiempo del servidor para ordenar correctamente
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toLocaleDateString('es-MX')
            });

            // Solo cerramos el modal. onSnapshot se encarga de la recarga.
            this.closeModal();
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar: ' + error.message);
        }
    }

    // Método de escucha en tiempo real (onSnapshot)
    loadNotes() {
        // Importante: 'db' ya está garantizado como inicializado por el bloque de abajo.
        db.collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => { // Esto se ejecuta en cada cambio
                
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
                // onSnapshot se encarga de la recarga automática después de la eliminación.
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
// INICIO DE LA APLICACIÓN (CORRECCIÓN CLAVE)
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Firebase de forma segura y garantizar el orden de ejecución
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            // 1. Inicializar Firebase App
            firebase.initializeApp(firebaseConfig);
            // 2. Obtener la referencia a Firestore
            db = firebase.firestore(); 
            
            // 3. SOLO AHORA, iniciamos la aplicación
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