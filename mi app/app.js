class NotesApp {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.currentEditIndex = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderNotes();
        this.setupPWA();
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

    saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            alert('Por favor, completa tanto el título como el contenido');
            return;
        }

        const note = {
            title,
            content,
            date: new Date().toLocaleDateString()
        };

        if (this.currentEditIndex !== null) {
            this.notes[this.currentEditIndex] = note;
        } else {
            this.notes.push(note);
        }

        this.saveToLocalStorage();
        this.renderNotes();
        this.closeModal();
    }

    deleteNote(index) {
        if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            this.notes.splice(index, 1);
            this.saveToLocalStorage();
            this.renderNotes();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
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
        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('Service Worker registrado correctamente'))
                .catch(err => console.log('Error registrando SW:', err));
        }
        
        // Solicitar permisos para notificaciones (opcional)
        this.requestNotificationPermission();
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Inicializar la aplicación cuando se carga la página
const app = new NotesApp();