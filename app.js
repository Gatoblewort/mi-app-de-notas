// =================================================================
// Configuración de Firebase (Asegúrate de que esta sea tu configuración real)
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

let db = null; 

// Función auxiliar para formatear la fecha y hora
function formatNoteTimestamp(timestamp) {
    if (!timestamp) { return 'Sin fecha'; }
    let date;
    
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'Guardando...'; 
    }

    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-MX', options);
}

// =================================================================
// Clase Principal de la Aplicación (CON EDICIÓN)
// =================================================================
class NotesApp {
    constructor() {
        this.notes = [];
        this.saveBtn = document.getElementById('saveNoteBtn'); 
        this.modalTitle = document.querySelector('#noteModal h2'); 
        this.editingId = null; // ID de la nota que se está editando (null si es nueva)
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes(); 
    }

    setupEventListeners() {
        // Botón Nueva Nota
        document.getElementById('addNoteBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Botón Guardar/Actualizar
        this.saveBtn.addEventListener('click', () => {
            this.saveNote();
        });

        // Cerrar Modal (X y Clic fuera)
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Listener de Colores
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectColor(e.target);
            });
        });
    }

    // Prepara el modal para editar una nota existente
    editNote(noteId) {
        const noteToEdit = this.notes.find(note => note.id === noteId);
        if (noteToEdit) {
            this.openModal(noteToEdit);
        }
    }

    selectColor(selectedElement) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedElement.classList.add('active');
    }

    // Abre el modal y carga datos si se pasa una nota
    openModal(note = null) {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'block';
        
        // 1. Limpiar/Cargar campos
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content : '';
        
        // 2. Lógica de Edición vs. Creación
        if (note) {
            this.editingId = note.id;
            this.modalTitle.textContent = 'Editar Nota';
            this.saveBtn.textContent = 'Actualizar Nota';
        } else {
            this.editingId = null; 
            this.modalTitle.textContent = 'Nueva Nota';
            this.saveBtn.textContent = 'Guardar Nota';
        }

        // 3. Cargar Color
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            const colorToSelect = note ? note.color : 'white';
            if (option.dataset.color === colorToSelect) {
                option.classList.add('active');
            }
        });

        this.saveBtn.disabled = false;
        setTimeout(() => {
            document.getElementById('noteTitle').focus();
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'none';
        this.editingId = null; 
    }

    // Decide si crear (add) o actualizar (update)
    async saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            alert('Por favor, escribe un título y contenido');
            return;
        }

        const selectedColorElement = document.querySelector('.color-selector .active');
        const color = selectedColorElement ? selectedColorElement.dataset.color : 'white';

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = this.editingId ? 'Actualizando...' : 'Guardando...';

        try {
            const data = {
                title: title,
                content: content,
                color: color,
            };

            if (this.editingId) {
                // ACTUALIZAR (Editar)
                await db.collection('notes').doc(this.editingId).update(data);
            } else {
                // CREAR (Nueva Nota)
                data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('notes').add(data);
            }

            this.closeModal();
            
        } catch (error) {
            console.error(this.editingId ? 'Error actualizando nota:' : 'Error guardando nota:', error);
            alert('Error: ' + error.message);
            
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = this.editingId ? 'Actualizar Nota' : 'Guardar Nota';
        }
    }

    loadNotes() {
        // Escucha en tiempo real (onSnapshot)
        db.collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    color: doc.data().color || 'white', 
                    ...doc.data() 
                }));
                
                this.displayNotes();
            }, error => {
                console.error('Error al escuchar cambios en notas:', error);
            });
    }

    // Renderiza las notas con los botones de Editar y Eliminar
    displayNotes() {
        const container = document.getElementById('notesContainer');
        
        if (this.notes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay notas aún. ¡Crea tu primera nota!</p>';
            return;
        }

        container.innerHTML = this.notes.map(note => `
            <div class="note ${note.color}">
                <h3>${this.escapeHtml(note.title)}</h3>
                <p>${this.escapeHtml(note.content)}</p>
                <div class="note-meta">
                    <small>${formatNoteTimestamp(note.timestamp)}</small>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" onclick="app.editNote('${note.id}')">Editar</button>
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