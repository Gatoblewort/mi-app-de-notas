// =================================================================
// Configuración de Firebase
// Mantenemos la configuración original
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
        // Solo llamamos a la escucha de notas, que ahora es continua
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
                timestamp: firebase.firestore.FieldValue.serverTimestamp(), // MEJORA: Usar la marca de tiempo del servidor
                date: new Date().toLocaleDateString('es-MX')
            });

            // Solo cerramos el modal. Ya NO necesitamos llamar a this.loadNotes(), 
            // porque onSnapshot lo hará automáticamente.
            this.closeModal();
            
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar: ' + error.message);
        }
    }

    // =================================================================
    // CÓDIGO CORREGIDO: Usamos onSnapshot para Sincronización en Tiempo Real
    // =================================================================
    loadNotes() {
        // onSnapshot establece una "escucha" continua. 
        // Se activa inmediatamente y luego cada vez que la colección cambia en Firebase.
        try {
            db.collection('notes')
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    
                    this.notes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        // Convertimos el Timestamp a un objeto Date (si existe)
                        // Firebase v8 maneja esto automáticamente en .data(), pero esta es una buena práctica.
                        ...doc.data() 
                    }));
                    
                    this.displayNotes();
                }, error => {
                    console.error('Error al escuchar cambios en notas:', error);
                });
        } catch (error) {
            console.error('Error cargando la configuración inicial de notas:', error);
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
                // Al eliminar, onSnapshot se encarga de recargar la lista automáticamente.
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
// Inicio de la aplicación con chequeo de Firebase
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Firebase de forma segura
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); // Asignamos la instancia a la variable 'db'
        
        // Solo iniciamos la app si Firebase se inicializó correctamente
        window.app = new NotesApp();
    } else {
        console.error("Firebase no está cargado. Asegúrate de incluir los scripts de Firebase en tu index.html ANTES de app.js.");
        // Opcional: Mostrar un error al usuario si no hay conexión.
        const container = document.getElementById('notesContainer');
        if(container) {
             container.innerHTML = '<h2 style="color:red; text-align:center;">ERROR: No se pudo conectar a la base de datos (Firebase no cargado).</h2>';
        }
    }
});