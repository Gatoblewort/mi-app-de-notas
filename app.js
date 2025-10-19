// =================================================================
// Función auxiliar para formatear la fecha y hora (Se mantiene igual)
// =================================================================
function formatNoteTimestamp(timestamp) {
    // ... (Mantener la función formatNoteTimestamp que te di en la respuesta anterior) ...
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
// Clase Principal de la Aplicación (Modificada)
// =================================================================
class NotesApp {
    constructor() {
        this.notes = [];
        this.saveBtn = document.getElementById('saveNoteBtn'); 
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes(); 
    }

    setupEventListeners() {
        // ... (Listeners de botones y modal se mantienen) ...
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
        
        // 🟢 NUEVO LISTENER: Selección de colores
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectColor(e.target);
            });
        });
    }

    // 🟢 NUEVA FUNCIÓN: Maneja la selección de color
    selectColor(selectedElement) {
        // 1. Quitar la clase 'active' de todos los colores
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        // 2. Añadir la clase 'active' solo al elemento seleccionado
        selectedElement.classList.add('active');
    }

    openModal() {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'block';
        
        // Limpiar campos
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        
        this.saveBtn.disabled = false;
        this.saveBtn.textContent = 'Guardar Nota';

        // 🟢 NUEVA LÓGICA: Establecer el color predeterminado (white) como activo
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === 'white') {
                option.classList.add('active');
            }
        });

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

        // 🟢 NUEVA LÓGICA: Obtener el color seleccionado
        const selectedColorElement = document.querySelector('.color-selector .active');
        const color = selectedColorElement ? selectedColorElement.dataset.color : 'white';

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Guardando...';

        try {
            await db.collection('notes').add({
                title: title,
                content: content,
                color: color, // 🟢 Guardamos el color en Firebase
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            this.closeModal();
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar: ' + error.message);
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Guardar Nota';
        }
    }

    loadNotes() {
        db.collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    // Aseguramos que el color tenga un valor por defecto si no existe
                    color: doc.data().color || 'white', 
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
            <div class="note ${note.color}">
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

    // ... (deleteNote, escapeHtml y el Bloque de Inicio se mantienen iguales) ...
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
// INICIO DE LA APLICACIÓN (Se mantiene igual)
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            // ... (Bloque de inicialización de Firebase se mantiene igual) ...
            const firebaseConfig = {
                apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
                authDomain: "mis-notas-app-e87a2.firebaseapp.com",
                projectId: "mis-notas-app-e87a2",
                storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
                messagingSenderId: "363846734339",
                appId: "1:363846734339:web:a27ac4eb966ed56442b436"
            };

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