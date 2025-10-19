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

let db = null; 
// 🟢 NUEVO: Inicialización de Firebase Storage
let storage = null; 

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

// 🟢 NUEVA FUNCIÓN: Subir archivo a Firebase Storage
async function uploadFile(file) {
    if (!file || !storage) {
        return null;
    }

    // Crea una referencia única para el archivo
    const uniqueId = Date.now() + '-' + file.name;
    const storageRef = storage.ref('notes_images/' + uniqueId);

    // Sube el archivo
    const snapshot = await storageRef.put(file);
    
    // Obtiene la URL de descarga
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return downloadURL;
}

// =================================================================
// Clase Principal de la Aplicación (CON IMÁGENES)
// =================================================================
class NotesApp {
    constructor() {
        this.notes = [];
        this.saveBtn = document.getElementById('saveNoteBtn'); 
        this.modalTitle = document.querySelector('#noteModal h2'); 
        this.imageInput = document.getElementById('noteImage'); // 🟢 Referencia al input de archivo
        this.editingId = null; 
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes(); 
    }

    setupEventListeners() {
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
        
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectColor(e.target);
            });
        });
    }

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

    openModal(note = null) {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'block';
        
        // Limpiar/Cargar campos
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content : '';
        this.imageInput.value = ''; // 🟢 Limpiar input de archivo
        
        // Lógica de Edición vs. Creación
        if (note) {
            this.editingId = note.id;
            this.modalTitle.textContent = 'Editar Nota';
            this.saveBtn.textContent = 'Actualizar Nota';
        } else {
            this.editingId = null; 
            this.modalTitle.textContent = 'Nueva Nota';
            this.saveBtn.textContent = 'Guardar Nota';
        }

        // Cargar Color
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

    async saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const imageFile = this.imageInput.files[0]; // 🟢 Obtener el archivo

        if (!title || !content) {
            alert('Por favor, escribe un título y contenido');
            return;
        }

        const selectedColorElement = document.querySelector('.color-selector .active');
        const color = selectedColorElement ? selectedColorElement.dataset.color : 'white';

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = this.editingId ? 'Actualizando...' : 'Guardando...';

        try {
            let imageUrl = null;

            // 🟢 Paso 1: Subir la imagen si existe
            if (imageFile) {
                imageUrl = await uploadFile(imageFile);
            }

            const data = {
                title: title,
                content: content,
                color: color,
                // Solo añadir la URL si se subió o si ya existía (en el caso de edición,
                // se mantendría la URL antigua si no se sube una nueva)
                ...(imageUrl && { imageUrl: imageUrl }) 
            };
            
            // Si estás editando y no subiste una nueva imagen, no sobrescribas imageUrl
            if (this.editingId && !imageFile) {
                // No hacemos nada, simplemente mantenemos la URL anterior en Firestore
            }

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
            console.error(this.editingId ? 'Error actualizando nota con imagen:' : 'Error guardando nota con imagen:', error);
            alert('Error al guardar la nota. Revisa la consola para más detalles.');
            
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = this.editingId ? 'Actualizar Nota' : 'Guardar Nota';
        }
    }

    loadNotes() {
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

    // Renderiza las notas con la imagen (si existe)
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
                
                ${note.imageUrl ? `<img src="${note.imageUrl}" alt="Imagen de la nota" class="note-image">` : ''}
                
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
                // Opcional: Implementar la eliminación del archivo de Storage aquí
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
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.storage) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore(); 
            storage = firebase.storage(); // 🟢 Inicializar Storage aquí
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