// ==================================================
// Mis Notas App - Con Grabación de Voz y Archivos
// ==================================================

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAom3LUnJQWK8t9h0G1mftIvClyPDiG1A",
    authDomain: "mis-notas-app-e87a2.firebaseapp.com",
    projectId: "mis-notas-app-e87a2",
    storageBucket: "mis-notas-app-e87a2.firebasestorage.app",
    messagingSenderId: "363846734339",
    appId: "1:363846734339:web:a27ac4eb966ed56442b436"
};

// Variables globales
let db = null;
let storage = null;
let appInstance = null;
let favorites = JSON.parse(localStorage.getItem('noteFavorites')) || {};
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = null;

// Inicializar Firebase de forma segura
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está cargado');
            showError('Error: Firebase no está disponible');
            return false;
        }

        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        
        console.log('✅ Firebase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        showError('Error de conexión con la base de datos');
        return false;
    }
}

// Mostrar errores amigables
function showError(message) {
    const container = document.getElementById('notesContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <h3>😕 Algo salió mal</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Reintentar</button>
            </div>
        `;
    }
}

// Función para subir archivos a Firebase Storage
async function uploadFile(file, noteId) {
    return new Promise((resolve, reject) => {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${noteId}/${Date.now()}_${file.name}`;
        const fileRef = storage.ref().child(fileName);
        
        const uploadTask = fileRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progreso de subida
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Subiendo archivo: ${progress}%`);
            },
            (error) => {
                reject(error);
            },
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    resolve({
                        url: downloadURL,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        extension: fileExtension
                    });
                });
            }
        );
    });
}

// Función para obtener icono según tipo de archivo
function getFileIcon(fileType, extension) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('audio')) return '🎵';
    if (extension === 'doc' || extension === 'docx') return '📝';
    if (extension === 'txt') return '📄';
    return '📎';
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para formatear fecha de manera amigable
function formatNoteTimestamp(timestamp) {
    if (!timestamp) return 'Sin fecha';
    
    try {
        let date;
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return 'Recién guardada';
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

        return date.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        return 'Fecha desconocida';
    }
}

// Clase Principal de la Aplicación
class NotesApp {
    constructor() {
        this.notes = [];
        this.filteredNotes = [];
        this.editingId = null;
        this.isOnline = navigator.onLine;
        this.searchTerm = '';
        this.currentCategory = 'all';
        this.recordedAudio = null;
        this.selectedFiles = [];
        this.init();
    }

    init() {
        console.log('🚀 Iniciando Mis Notas App con Voz y Archivos...');
        this.setupEventListeners();
        this.setupNetworkDetection();
        this.checkServiceWorker();
        this.loadTheme();
        
        if (initializeFirebase()) {
            this.loadNotes();
        }
    }

    setupEventListeners() {
        // Botones principales
        this.safeAddEventListener('addNoteBtn', 'click', () => this.openModal());
        this.safeAddEventListener('addVoiceNoteBtn', 'click', () => this.showVoiceRecorder());
        
        // Grabadora de voz
        this.safeAddEventListener('startRecording', 'click', () => this.startRecording());
        this.safeAddEventListener('stopRecording', 'click', () => this.stopRecording());
        this.safeAddEventListener('playRecording', 'click', () => this.playRecording());
        this.safeAddEventListener('saveRecording', 'click', () => this.saveVoiceNote());
        this.safeAddEventListener('cancelRecording', 'click', () => this.hideVoiceRecorder());
        
        // Modal
        this.safeAddEventListener('saveNoteBtn', 'click', () => this.saveNote());
        this.safeAddEventListener('close', 'click', () => this.closeModal());
        this.safeAddEventListener('noteFiles', 'change', (e) => this.handleFileSelect(e));
        
        // Búsqueda y filtros
        this.safeAddEventListener('searchInput', 'input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterNotes();
        });
        this.safeAddEventListener('categoryFilter', 'change', (e) => {
            this.currentCategory = e.target.value;
            this.filterNotes();
        });
        this.safeAddEventListener('clearSearch', 'click', () => this.clearSearch());
        
        // Tema
        this.safeAddEventListener('themeToggle', 'click', () => this.toggleTheme());

        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) this.closeModal();
        });

        // Tecla ESC para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.hideVoiceRecorder();
            }
        });

        console.log('✅ Event listeners configurados');
    }

    // Método seguro para agregar event listeners
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Elemento no encontrado: ${elementId}`);
        }
    }

    // =================================================
    // SISTEMA DE GRABACIÓN DE VOZ
    // =================================================
    async showVoiceRecorder() {
        document.getElementById('voiceRecorder').style.display = 'block';
        this.updateRecorderStatus('Preparado para grabar');
        this.resetRecorder();
    }

    hideVoiceRecorder() {
        document.getElementById('voiceRecorder').style.display = 'none';
        this.stopRecording();
        this.resetRecorder();
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                this.recordedAudio = audioBlob;
                this.updateRecorderStatus('Grabación completada');
                this.enablePlayback();
            };

            mediaRecorder.start();
            this.startRecordingTimer();
            this.updateRecorderUI(true);
            this.updateRecorderStatus('Grabando... 🎤');

        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            this.updateRecorderStatus('Error: No se pudo acceder al micrófono');
        }
    }

    stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.stopRecordingTimer();
            this.updateRecorderUI(false);
        }
    }

    playRecording() {
        if (this.recordedAudio) {
            const audioUrl = URL.createObjectURL(this.recordedAudio);
            const audioPreview = document.getElementById('audioPreview');
            audioPreview.src = audioUrl;
            audioPreview.style.display = 'block';
            audioPreview.play();
        }
    }

    startRecordingTimer() {
        recordingStartTime = Date.now();
        recordingTimer = setInterval(() => {
            const elapsed = Date.now() - recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('recordingTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
    }

    updateRecorderUI(isRecording) {
        const visualizer = document.getElementById('visualizer');
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const playBtn = document.getElementById('playRecording');
        const saveBtn = document.getElementById('saveRecording');

        if (isRecording) {
            visualizer.classList.add('recording');
            startBtn.disabled = true;
            stopBtn.disabled = false;
            playBtn.disabled = true;
            saveBtn.disabled = true;
        } else {
            visualizer.classList.remove('recording');
            startBtn.disabled = false;
            stopBtn.disabled = true;
            playBtn.disabled = false;
            saveBtn.disabled = false;
        }
    }

    enablePlayback() {
        document.getElementById('playRecording').disabled = false;
        document.getElementById('saveRecording').disabled = false;
    }

    updateRecorderStatus(message) {
        document.getElementById('recorderStatus').textContent = message;
    }

    resetRecorder() {
        this.recordedAudio = null;
        document.getElementById('recordingTime').textContent = '00:00';
        document.getElementById('audioPreview').style.display = 'none';
        document.getElementById('audioPreview').src = '';
        this.updateRecorderUI(false);
    }

    async saveVoiceNote() {
        if (!this.recordedAudio) {
            alert('No hay grabación para guardar');
            return;
        }

        const title = prompt('Título para la nota de voz:', `Nota de voz ${new Date().toLocaleString()}`);
        if (!title) return;

        const saveBtn = document.getElementById('saveRecording');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            // Subir audio a Firebase Storage
            const audioFile = new File([this.recordedAudio], `voice_note_${Date.now()}.wav`, { 
                type: 'audio/wav' 
            });
            
            const noteData = {
                title: title,
                content: '🎤 Nota de voz',
                color: 'blue',
                type: 'voice',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: new Date().toISOString()
            };

            const result = await db.collection('notes').add(noteData);
            const audioInfo = await uploadFile(audioFile, result.id);
            
            // Actualizar nota con URL del audio
            await db.collection('notes').doc(result.id).update({
                audioUrl: audioInfo.url,
                audioDuration: Math.round(this.recordedAudio.size / 16000) // Estimación aproximada
            });

            this.hideVoiceRecorder();
            this.loadNotes();
            this.showStatus('Nota de voz guardada', 'success');

        } catch (error) {
            console.error('Error guardando nota de voz:', error);
            alert('Error al guardar la nota de voz: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    // =================================================
    // SISTEMA DE ARCHIVOS
    // =================================================
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`El archivo ${file.name} es muy grande (máximo 5MB)`);
                return false;
            }
            return true;
        });

        this.selectedFiles = [...this.selectedFiles, ...validFiles];
        this.renderFilePreviews();
    }

    renderFilePreviews() {
        const container = document.getElementById('filesPreview');
        container.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const extension = file.name.split('.').pop();
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            preview.innerHTML = `
                <div class="file-icon">${getFileIcon(file.type, extension)}</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="file-remove" onclick="app.removeFile(${index})">×</button>
            `;
            container.appendChild(preview);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFilePreviews();
    }

    // =================================================
    // SISTEMA DE NOTAS MEJORADO
    // =================================================
    async saveNote() {
        if (!this.isOnline) {
            alert('⚠️ No hay conexión a internet. Conéctate para guardar notas.');
            return;
        }

        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const selectedColor = document.querySelector('.color-option.active').dataset.color;

        if (!title) {
            alert('📝 Por favor, escribe un título para tu nota');
            document.getElementById('noteTitle').focus();
            return;
        }

        const saveBtn = document.getElementById('saveNoteBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            const noteData = {
                title: title,
                content: content,
                color: selectedColor,
                type: 'text',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: new Date().toISOString()
            };

            // Determinar tipo de nota
            if (this.selectedFiles.length > 0) {
                noteData.type = 'file';
                noteData.hasAttachments = true;
            }

            let noteId;
            if (this.editingId) {
                noteId = this.editingId;
                await db.collection('notes').doc(noteId).update(noteData);
                console.log('✅ Nota actualizada:', noteId);
            } else {
                const result = await db.collection('notes').add(noteData);
                noteId = result.id;
                console.log('✅ Nota creada:', noteId);
            }

            // Subir archivos si hay
            if (this.selectedFiles.length > 0) {
                saveBtn.textContent = 'Subiendo archivos...';
                const uploadPromises = this.selectedFiles.map(file => uploadFile(file, noteId));
                const uploadedFiles = await Promise.all(uploadPromises);
                
                await db.collection('notes').doc(noteId).update({
                    attachments: uploadedFiles
                });
            }

            this.closeModal();
            this.selectedFiles = [];
            this.loadNotes();
            
        } catch (error) {
            console.error('❌ Error guardando nota:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    // =================================================
    // RESTANTES MÉTODOS (se mantienen similares)
    // =================================================
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showStatus('Conectado', 'online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showStatus('Sin conexión', 'offline');
        });
    }

    showStatus(message, type) {
        // Implementación existente
    }

    async checkServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker registrado:', registration);
            } catch (error) {
                console.error('❌ Error registrando Service Worker:', error);
            }
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light-mode';
        document.body.className = savedTheme;
        this.updateThemeButton(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.body.className;
        const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        document.body.className = newTheme;
        localStorage.setItem('theme', newTheme);
        this.updateThemeButton(newTheme);
    }

    updateThemeButton(theme) {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.textContent = theme === 'light-mode' ? '🌙' : '☀️';
        }
    }

    toggleFavorite(noteId) {
        if (favorites[noteId]) {
            delete favorites[noteId];
        } else {
            favorites[noteId] = true;
        }
        localStorage.setItem('noteFavorites', JSON.stringify(favorites));
        this.filterNotes();
    }

    isFavorite(noteId) {
        return !!favorites[noteId];
    }

    filterNotes() {
        this.filteredNotes = this.notes.filter(note => {
            const matchesSearch = !this.searchTerm || 
                note.title.toLowerCase().includes(this.searchTerm) ||
                note.content.toLowerCase().includes(this.searchTerm);

            let matchesCategory = true;
            if (this.currentCategory === 'favorites') {
                matchesCategory = this.isFavorite(note.id);
            } else if (this.currentCategory === 'voice') {
                matchesCategory = note.type === 'voice' || note.audioUrl;
            } else if (this.currentCategory === 'file') {
                matchesCategory = note.type === 'file' || note.attachments;
            } else if (this.currentCategory === 'image') {
                matchesCategory = note.imageData || (note.attachments && 
                    note.attachments.some(att => att.type.startsWith('image/')));
            } else if (this.currentCategory === 'text') {
                matchesCategory = note.type === 'text' && !note.attachments && !note.audioUrl;
            } else if (this.currentCategory !== 'all') {
                matchesCategory = note.color === this.currentCategory;
            }

            return matchesSearch && matchesCategory;
        });

        this.displayNotes();
        this.updateStats();
    }

    updateStats() {
        const totalNotes = this.notes.length;
        const favoriteCount = Object.keys(favorites).length;
        const voiceCount = this.notes.filter(note => note.type === 'voice' || note.audioUrl).length;
        const filteredCount = this.filteredNotes.length;

        document.getElementById('notesCount').textContent = `${filteredCount} notas`;
        document.getElementById('favoritesCount').textContent = `${favoriteCount} favoritas`;
        document.getElementById('voiceNotesCount').textContent = `${voiceCount} de voz`;
    }

    selectColor(selectedElement) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        selectedElement.classList.add('active');
    }

    openModal(note = null) {
        const modal = document.getElementById('noteModal');
        if (!modal) return;

        modal.style.display = 'block';
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content : '';
        document.getElementById('noteFiles').value = '';
        this.selectedFiles = [];
        document.getElementById('filesPreview').innerHTML = '';

        if (note) {
            this.editingId = note.id;
            document.getElementById('modalTitle').textContent = 'Editar Nota';
            document.getElementById('saveNoteBtn').textContent = '💾 Actualizar Nota';
            
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('active');
                if (option.dataset.color === (note.color || 'white')) {
                    option.classList.add('active');
                }
            });
        } else {
            this.editingId = null;
            document.getElementById('modalTitle').textContent = 'Nueva Nota';
            document.getElementById('saveNoteBtn').textContent = '💾 Guardar Nota';
            
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('active');
                if (option.dataset.color === 'white') {
                    option.classList.add('active');
                }
            });
        }

        setTimeout(() => {
            const titleInput = document.getElementById('noteTitle');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('noteModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingId = null;
        this.selectedFiles = [];
    }

    loadNotes() {
        if (!db) {
            console.error('Firestore no está disponible');
            return;
        }

        db.collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                this.filterNotes();
            }, error => {
                console.error('❌ Error cargando notas:', error);
                this.showStatus('Error cargando notas', 'error');
            });
    }

    displayNotes() {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        
        const notesToDisplay = this.filteredNotes.length > 0 ? this.filteredNotes : this.notes;
        
        if (notesToDisplay.length === 0) {
            let message = '';
            if (this.searchTerm || this.currentCategory !== 'all') {
                message = `
                    <div class="empty-state">
                        <div class="icon">🔍</div>
                        <h3>No se encontraron notas</h3>
                        <p>No hay notas que coincidan con tu búsqueda o filtro.</p>
                        <button onclick="app.clearSearch()">Mostrar todas las notas</button>
                    </div>
                `;
            } else {
                message = `
                    <div class="empty-state">
                        <div class="icon">📝</div>
                        <h3>No hay notas aún</h3>
                        <p>¡Crea tu primera nota haciendo clic en el botón de arriba!</p>
                        <button onclick="app.openModal()">+ Crear Mi Primera Nota</button>
                    </div>
                `;
            }
            container.innerHTML = message;
            return;
        }

        container.innerHTML = notesToDisplay.map(note => {
            const noteType = note.type || 'text';
            const isVoiceNote = noteType === 'voice' || note.audioUrl;
            const hasAttachments = note.attachments && note.attachments.length > 0;
            
            return `
                <div class="note ${note.color || 'white'} ${isVoiceNote ? 'voice-note' : ''} ${hasAttachments ? 'file-note' : ''} ${this.isFavorite(note.id) ? 'favorite' : ''}">
                    ${isVoiceNote ? '<span class="note-type-badge">🎤 Voz</span>' : ''}
                    ${hasAttachments ? '<span class="note-type-badge">📎 Archivos</span>' : ''}
                    
                    <h3>${this.escapeHtml(note.title)}</h3>
                    <p>${this.escapeHtml(note.content)}</p>
                    
                    ${note.imageData ? `
                        <img src="${note.imageData}" alt="Imagen de la nota" class="note-image" 
                             onerror="this.style.display='none'">
                    ` : ''}
                    
                    ${note.audioUrl ? `
                        <div class="voice-player">
                            <audio controls>
                                <source src="${note.audioUrl}" type="audio/wav">
                                Tu navegador no soporta audio.
                            </audio>
                        </div>
                    ` : ''}
                    
                    ${note.attachments && note.attachments.length > 0 ? `
                        <div class="note-attachments">
                            ${note.attachments.map(att => `
                                <div class="attachment">
                                    <div class="attachment-icon">${getFileIcon(att.type, att.extension)}</div>
                                    <div class="attachment-info">
                                        <div class="attachment-name">${att.name}</div>
                                        <div class="attachment-size">${formatFileSize(att.size)}</div>
                                    </div>
                                    <a href="${att.url}" download="${att.name}" class="attachment-download">
                                        📥
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="note-meta">
                        <small>${formatNoteTimestamp(note.timestamp)}</small>
                        <small>${this.getColorName(note.color)}</small>
                    </div>
                    <div class="note-actions">
                        <button class="favorite-btn ${this.isFavorite(note.id) ? 'active' : ''}" 
                                onclick="app.toggleFavorite('${note.id}')">
                            ${this.isFavorite(note.id) ? '★' : '☆'} Favorita
                        </button>
                        <button class="edit-btn" onclick="app.editNote('${note.id}')">✏️ Editar</button>
                        <button class="delete-btn" onclick="app.deleteNote('${note.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getColorName(color) {
        const colorNames = {
            'white': '📄 Blanca',
            'yellow': '💛 Amarilla', 
            'pink': '💗 Rosa',
            'blue': '💙 Azul',
            'green': '💚 Verde',
            'purple': '💜 Morada'
        };
        return colorNames[color] || '📄 Blanca';
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'all';
        this.searchTerm = '';
        this.currentCategory = 'all';
        this.filterNotes();
    }

    editNote(noteId) {
        const noteToEdit = this.notes.find(note => note.id === noteId);
        if (noteToEdit) {
            this.openModal(noteToEdit);
        }
    }

    async deleteNote(noteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            return;
        }

        try {
            await db.collection('notes').doc(noteId).delete();
            console.log('✅ Nota eliminada:', noteId);
            if (favorites[noteId]) {
                delete favorites[noteId];
                localStorage.setItem('noteFavorites', JSON.stringify(favorites));
            }
        } catch (error) {
            console.error('❌ Error eliminando nota:', error);
            alert('Error eliminando nota: ' + error.message);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar la aplicación cuando todo esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Mis Notas App con Voz y Archivos - Inicializando...');
    appInstance = new NotesApp();
    window.app = appInstance;
});

console.log('🎉 Mis Notas App con Voz y Archivos - Código cargado');