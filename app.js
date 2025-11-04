document.addEventListener('DOMContentLoaded', () => {
    // =================================================
    // 1. CONFIGURACIÓN DE ELEMENTOS DEL DOM
    // =================================================
    const elements = {
        // Controles de la App
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        openModalBtn: document.getElementById('openModalBtn'),
        openVoiceModalBtn: document.getElementById('openVoiceModalBtn'),
        notesContainer: document.getElementById('notesContainer'),
        emptyState: document.getElementById('emptyState'),
        emptyStateCreateBtn: document.getElementById('emptyStateCreateBtn'),

        // Estadísticas
        totalNotesCount: document.getElementById('totalNotesCount'),
        favoriteNotesCount: document.getElementById('favoriteNotesCount'),
        fileNotesCount: document.getElementById('fileNotesCount'),
        voiceNotesCount: document.getElementById('voiceNotesCount'),

        // Búsqueda y Filtros
        searchInput: document.getElementById('searchInput'),
        categoryFilter: document.getElementById('categoryFilter'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),
        categoriesList: document.getElementById('categoriesList'),

        // Modal de Nota (CRUD)
        noteModal: document.getElementById('noteModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        modalTitle: document.getElementById('modalTitle'),
        noteForm: document.getElementById('noteForm'),
        noteTitle: document.getElementById('noteTitle'),
        noteContent: document.getElementById('noteContent'),
        noteCategory: document.getElementById('noteCategory'),
        colorSelector: document.getElementById('colorSelector'),
        filesInput: document.getElementById('noteFiles'),
        filesPreview: document.getElementById('filesPreview'),
        existingFilesPreview: document.getElementById('existingFilesPreview'),
        voiceAttachmentSection: document.getElementById('voiceAttachmentSection'),
        existingVoiceAttachment: document.getElementById('existingVoiceAttachment'),
        removeExistingVoiceBtn: document.getElementById('removeExistingVoiceBtn'),
        saveNoteBtn: document.getElementById('saveNoteBtn'),
        
        // Modal de Grabadora de Voz
        voiceRecorderModal: document.getElementById('voiceRecorderModal'),
        closeVoiceModalBtn: document.getElementById('closeVoiceModalBtn'),
        recordBtn: document.getElementById('recordBtn'),
        stopBtn: document.getElementById('stopBtn'),
        playBtn: document.getElementById('playBtn'),
        saveVoiceBtn: document.getElementById('saveVoiceBtn'),
        cancelVoiceBtn: document.getElementById('cancelVoiceBtn'),
        recorderTime: document.getElementById('recorderTime'),
        recorderStatus: document.getElementById('recorderStatus'),
        audioPreview: document.getElementById('audioPreview'),
        audioVisualizer: document.getElementById('audioVisualizer'),
    };

    // =================================================
    // 2. VARIABLES GLOBALES DE LA APLICACIÓN
    // =================================================
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let isEditing = false;
    let currentNoteId = null;
    let tempFiles = []; // Archivos seleccionados en el modal
    let existingFiles = []; // Archivos existentes en la nota (para edición)
    
    // Variables para la Grabadora de Voz
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob = null;
    let audioUrl = null;
    let timerInterval;
    let seconds = 0;

    // =================================================
    // 3. FUNCIONES DE UTILIDAD (ALMACENAMIENTO)
    // =================================================

    /** Guarda las notas en localStorage */
    const saveNotes = () => {
        localStorage.setItem('notes', JSON.stringify(notes));
        updateStats();
        renderNotes(notes);
        updateCategoryFilters();
    };

    /** Genera un ID único (simulación simple) */
    const generateId = () => Date.now().toString();

    // =================================================
    // 4. MANEJO DE NOTAS (CRUD y Renderizado)
    // =================================================

    /** Crea el HTML para una nota individual */
    const createNoteElement = (note) => {
        const noteElement = document.createElement('div');
        noteElement.className = `note ${note.color} ${note.isVoiceNote ? 'voice-note' : ''} ${note.files.length > 0 ? 'file-note' : ''}`;
        noteElement.setAttribute('data-id', note.id);

        // Contenido principal de la nota
        let contentHTML = `
            <h3>${note.title || 'Sin Título'}</h3>
            <p>${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
        `;

        // Badge de Tipo de Nota
        if (note.isVoiceNote) {
            contentHTML += `<span class="note-type-badge"><i class="fas fa-microphone"></i> Voz</span>`;
        } else if (note.files.length > 0) {
             contentHTML += `<span class="note-type-badge"><i class="fas fa-file-alt"></i> Archivo</span>`;
        }

        // Archivos Adjuntos (incluye audio)
        if (note.files.length > 0 || note.isVoiceNote) {
            contentHTML += `<div class="note-attachments">`;
            
            // Audio (si existe)
            if (note.isVoiceNote && note.voiceData) {
                contentHTML += `
                    <div class="attachment voice-attachment">
                        <div class="attachment-icon" style="color: #FF6B6B;"><i class="fas fa-volume-up"></i></div>
                        <div class="attachment-info">
                            <div class="attachment-name">Nota de Voz</div>
                            <div class="attachment-size">${formatTime(note.duration || 0)}</div>
                        </div>
                        <div class="voice-player">
                            <audio controls src="${note.voiceData}"></audio>
                        </div>
                    </div>
                `;
            }

            // Archivos normales
            note.files.forEach(file => {
                const icon = getFileIcon(file.type);
                contentHTML += `
                    <div class="attachment">
                        <div class="attachment-icon" style="color: ${icon.color};"><i class="${icon.class}"></i></div>
                        <div class="attachment-info">
                            <div class="attachment-name">${file.name}</div>
                            <div class="attachment-size">${file.size}</div>
                        </div>
                        <a href="${file.data}" download="${file.name}" class="attachment-download" title="Descargar">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                `;
            });

            contentHTML += `</div>`;
        }

        // Meta y Acciones
        contentHTML += `
            <div class="note-meta">
                <span><i class="fas fa-tag"></i> ${note.category}</span>
                <span><i class="fas fa-calendar-alt"></i> ${new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="note-actions">
                <button class="favorite-btn ${note.isFavorite ? 'active' : ''}" data-id="${note.id}" title="Marcar como Favorita">
                    <i class="${note.isFavorite ? 'fas' : 'far'} fa-star"></i>
                </button>
                <button class="edit-btn" data-id="${note.id}" title="Editar Nota">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="delete-btn" data-id="${note.id}" title="Eliminar Nota">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;

        noteElement.innerHTML = contentHTML;
        return noteElement;
    };
    
    /** Renderiza la lista de notas */
    const renderNotes = (filteredNotes = notes) => {
        elements.notesContainer.innerHTML = '';

        if (filteredNotes.length === 0) {
            elements.emptyState.style.display = 'block';
        } else {
            elements.emptyState.style.display = 'none';
            filteredNotes.forEach(note => {
                elements.notesContainer.appendChild(createNoteElement(note));
            });
        }
    };

    /** Guarda/Actualiza una nota */
    const saveNote = (e) => {
        e.preventDefault();

        const title = elements.noteTitle.value.trim();
        const content = elements.noteContent.value.trim();
        const category = elements.noteCategory.value.trim() || 'General';
        const color = elements.colorSelector.querySelector('.active').dataset.color;

        if (!title && !content && tempFiles.length === 0 && !audioBlob) {
            alert('La nota no puede estar vacía. Añade un título, contenido, o adjuntos.');
            return;
        }

        const newFiles = [...existingFiles, ...tempFiles.map(file => ({
            name: file.name,
            size: file.size,
            data: file.data,
            type: file.type.split('/')[0] // 'image', 'application', etc.
        }))];
        
        const noteData = {
            title,
            content,
            category,
            color,
            isFavorite: isEditing ? notes.find(n => n.id === currentNoteId).isFavorite : false,
            files: newFiles,
            isVoiceNote: !!audioBlob, // Si hay audioBlob, es una nota de voz
            voiceData: audioUrl,
            duration: seconds,
            createdAt: isEditing ? notes.find(n => n.id === currentNoteId).createdAt : Date.now(),
        };

        if (isEditing) {
            // Actualizar nota existente
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex] = { ...notes[noteIndex], ...noteData };
            }
        } else {
            // Crear nueva nota
            noteData.id = generateId();
            notes.unshift(noteData); // Añadir al principio
        }

        closeModal(elements.noteModal);
        saveNotes();
        resetModal();
        resetVoiceRecorder();
    };

    // =================================================
    // 5. MANEJO DE MODALES
    // =================================================

    /** Abre un modal */
    const openModal = (modalElement, title = 'Crear Nueva Nota') => {
        modalElement.style.display = 'block';
        elements.modalTitle.textContent = title;
        document.body.style.overflow = 'hidden'; // Evita el scroll en el fondo
    };

    /** Cierra un modal */
    const closeModal = (modalElement) => {
        modalElement.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetModal();
    };

    /** Limpia los campos del modal de nota */
    const resetModal = () => {
        elements.noteForm.reset();
        isEditing = false;
        currentNoteId = null;
        tempFiles = [];
        existingFiles = [];
        elements.filesPreview.innerHTML = '';
        elements.existingFilesPreview.innerHTML = '';
        
        // Reset de color
        elements.colorSelector.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('active');
        });
        elements.colorSelector.querySelector('[data-color="white"]').classList.add('active');

        // Ocultar sección de voz en el modal de nota
        elements.voiceAttachmentSection.style.display = 'none';
        elements.existingVoiceAttachment.innerHTML = '';
        audioBlob = null;
        audioUrl = null;
        seconds = 0;
    };

    /** Lógica para cargar nota en el modal de edición */
    const loadNoteForEditing = (id) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        isEditing = true;
        currentNoteId = id;

        // Cargar datos principales
        elements.noteTitle.value = note.title;
        elements.noteContent.value = note.content;
        elements.noteCategory.value = note.category;
        
        // Cargar color
        elements.colorSelector.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('active');
        });
        const colorOption = elements.colorSelector.querySelector(`[data-color="${note.color}"]`);
        if (colorOption) colorOption.classList.add('active');
        
        // Cargar archivos existentes
        existingFiles = note.files || [];
        renderExistingFiles(existingFiles);

        // Cargar nota de voz existente
        if (note.isVoiceNote && note.voiceData) {
            audioUrl = note.voiceData;
            seconds = note.duration || 0;
            audioBlob = true; // Solo para indicar que hay audio, el blob real no se guarda.
            
            elements.voiceAttachmentSection.style.display = 'block';
            elements.removeExistingVoiceBtn.style.display = 'block';
            
            elements.existingVoiceAttachment.innerHTML = `
                <div class="attachment-icon" style="color: #FF6B6B;"><i class="fas fa-volume-up"></i></div>
                <div class="attachment-info">
                    <div class="attachment-name">Nota de Voz Existente</div>
                    <div class="attachment-size">${formatTime(note.duration || 0)}</div>
                </div>
                <div class="voice-player" style="margin-top: 0; flex: 1;">
                    <audio controls src="${note.voiceData}"></audio>
                </div>
            `;
        } else {
            elements.voiceAttachmentSection.style.display = 'none';
        }

        openModal(elements.noteModal, 'Editar Nota');
    };

    /** Elimina una nota */
    const deleteNote = (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta nota? Esta acción es irreversible.')) {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
        }
    };

    // =================================================
    // 6. GESTIÓN DE ARCHIVOS
    // =================================================

    /** Obtiene el ícono y color basado en el tipo de archivo */
    const getFileIcon = (fileType) => {
        if (fileType.includes('image')) return { class: 'fas fa-image', color: '#007bff' };
        if (fileType.includes('audio')) return { class: 'fas fa-music', color: '#FF6B6B' };
        if (fileType.includes('video')) return { class: 'fas fa-video', color: '#9C27B0' };
        if (fileType.includes('pdf')) return { class: 'fas fa-file-pdf', color: '#f44336' };
        if (fileType.includes('document') || fileType.includes('text')) return { class: 'fas fa-file-alt', color: '#4CAF50' };
        return { class: 'fas fa-file', color: '#666666' };
    };
    
    /** Renderiza la previsualización de archivos existentes */
    const renderExistingFiles = (files) => {
        elements.existingFilesPreview.innerHTML = '';
        if (files.length === 0) return;

        files.forEach((file, index) => {
            const icon = getFileIcon(file.type);
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            preview.innerHTML = `
                <div class="file-icon" style="color: ${icon.color};"><i class="${icon.class}"></i></div>
                <div class="file-info">
                    <div class="file-name">${file.name} (Existente)</div>
                    <div class="file-size">${file.size}</div>
                </div>
                <button type="button" class="file-remove" data-index="${index}" data-type="existing" title="Eliminar archivo existente">
                    &times;
                </button>
            `;
            elements.existingFilesPreview.appendChild(preview);
        });
    };

    /** Renderiza la previsualización de archivos temporales (nuevos) */
    const renderTempFiles = () => {
        elements.filesPreview.innerHTML = '';
        if (tempFiles.length === 0) return;

        tempFiles.forEach((file, index) => {
            const icon = getFileIcon(file.type);
            const preview = document.createElement('div');
            preview.className = 'file-preview new-file';
            preview.innerHTML = `
                <div class="file-icon" style="color: ${icon.color};"><i class="${icon.class}"></i></div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button type="button" class="file-remove" data-index="${index}" data-type="temp" title="Quitar archivo">
                    &times;
                </button>
            `;
            elements.filesPreview.appendChild(preview);
        });
    };

    /** Maneja la selección de archivos del input */
    const handleFileSelection = (e) => {
        const files = Array.from(e.target.files);
        const maxFiles = 5;
        const maxFileSize = 2 * 1024 * 1024; // 2MB

        if (files.length + existingFiles.length + tempFiles.length > maxFiles) {
            alert(`Solo puedes adjuntar un máximo de ${maxFiles} archivos en total.`);
            e.target.value = ''; // Limpia el input
            return;
        }

        files.forEach(file => {
            if (file.size > maxFileSize) {
                alert(`El archivo "${file.name}" excede el límite de 2MB y será omitido.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                tempFiles.push({
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    data: event.target.result,
                    type: file.type,
                    file: file
                });
                renderTempFiles();
            };
            reader.readAsDataURL(file);
        });
        
        // Limpia el input para permitir seleccionar los mismos archivos de nuevo si el usuario lo desea
        e.target.value = ''; 
    };

    // =================================================
    // 7. GRABADORA DE VOZ
    // =================================================

    /** Formatea segundos a MM:SS */
    const formatTime = (totalSeconds) => {
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    /** Inicia el temporizador de grabación */
    const startTimer = () => {
        seconds = 0;
        elements.recorderTime.textContent = formatTime(seconds);
        timerInterval = setInterval(() => {
            seconds++;
            elements.recorderTime.textContent = formatTime(seconds);
        }, 1000);
    };

    /** Detiene el temporizador */
    const stopTimer = () => {
        clearInterval(timerInterval);
    };

    /** Reinicia el estado de la grabadora */
    const resetVoiceRecorder = () => {
        stopTimer();
        audioChunks = [];
        audioBlob = null;
        audioUrl = null;
        seconds = 0;
        
        elements.recorderTime.textContent = '00:00';
        elements.recorderStatus.textContent = 'Listo para grabar';
        elements.audioVisualizer.classList.remove('recording');
        
        elements.recordBtn.disabled = false;
        elements.stopBtn.disabled = true;
        elements.playBtn.disabled = true;
        elements.saveVoiceBtn.disabled = true;
        
        elements.audioPreview.style.display = 'none';
        elements.audioPreview.src = '';
    };

    /** Maneja el inicio de la grabación */
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Tu navegador no soporta la grabación de audio.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                stopTimer();
                // Detiene la pista de audio para liberar el micrófono
                stream.getTracks().forEach(track => track.stop()); 
                
                audioBlob = new Blob(audioChunks, { 'type': 'audio/mp3' });
                audioUrl = URL.createObjectURL(audioBlob);
                
                elements.audioPreview.src = audioUrl;
                elements.audioPreview.style.display = 'block';
                
                elements.playBtn.disabled = false;
                elements.saveVoiceBtn.disabled = false;
                elements.recorderStatus.textContent = `Grabación finalizada (${formatTime(seconds)})`;
                elements.audioVisualizer.classList.remove('recording');
            };

            mediaRecorder.start();
            startTimer();

            elements.recorderStatus.textContent = 'Grabando...';
            elements.audioVisualizer.classList.add('recording');
            elements.recordBtn.disabled = true;
            elements.stopBtn.disabled = false;
            elements.playBtn.disabled = true;
            elements.saveVoiceBtn.disabled = true;

        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            alert('No se pudo acceder al micrófono. Asegúrate de otorgar los permisos necesarios.');
            resetVoiceRecorder();
        }
    };

    /** Maneja la detención de la grabación */
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            elements.stopBtn.disabled = true;
        }
    };

    /** Simula el guardado de la nota de voz como nota de texto */
    const saveVoiceNote = () => {
        if (!audioBlob) {
            alert('No hay audio para guardar.');
            return;
        }
        
        // Cierra el modal de la grabadora
        closeModal(elements.voiceRecorderModal);
        
        // Abre el modal de nota para añadir título y metadatos
        openModal(elements.noteModal, 'Guardar Nota de Voz');
        
        // Pre-rellena campos
        elements.noteTitle.value = `Nota de Voz - ${new Date().toLocaleString()}`;
        elements.noteContent.value = `Duración: ${formatTime(seconds)}. Añade cualquier texto adicional aquí.`;
        
        // Muestra la sección de voz en el modal de nota
        elements.voiceAttachmentSection.style.display = 'block';
        elements.removeExistingVoiceBtn.style.display = 'block';
        
        // Renderiza el audio en el modal de nota para previsualización
        elements.existingVoiceAttachment.innerHTML = `
            <div class="attachment-icon" style="color: #FF6B6B;"><i class="fas fa-volume-up"></i></div>
            <div class="attachment-info">
                <div class="attachment-name">Grabación de Voz</div>
                <div class="attachment-size">${formatTime(seconds)}</div>
            </div>
            <div class="voice-player" style="margin-top: 0; flex: 1;">
                <audio controls src="${audioUrl}"></audio>
            </div>
        `;

        // El guardado final ocurrirá cuando se presione 'Guardar Nota' en el modal de nota
    };
    
    // =================================================
    // 8. MANEJO DE EVENTOS
    // =================================================
    
    // Eventos de la App
    elements.openModalBtn.addEventListener('click', () => openModal(elements.noteModal));
    elements.closeModalBtn.addEventListener('click', () => closeModal(elements.noteModal));
    elements.emptyStateCreateBtn.addEventListener('click', () => openModal(elements.noteModal));
    elements.noteModal.addEventListener('click', (e) => {
        if (e.target === elements.noteModal) closeModal(elements.noteModal);
    });
    
    // Eventos del Modal de Nota
    elements.noteForm.addEventListener('submit', saveNote);
    elements.colorSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            elements.colorSelector.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
        }
    });
    elements.filesInput.addEventListener('change', handleFileSelection);

    // Evento de eliminación de archivo (temporal o existente)
    elements.noteModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('file-remove')) {
            const index = e.target.dataset.index;
            const type = e.target.dataset.type;

            if (type === 'temp') {
                tempFiles.splice(index, 1);
                renderTempFiles();
            } else if (type === 'existing') {
                existingFiles.splice(index, 1);
                renderExistingFiles(existingFiles);
            }
        }
    });

    // Evento para quitar nota de voz existente en modo edición
    elements.removeExistingVoiceBtn.addEventListener('click', () => {
        if (confirm('¿Deseas quitar la grabación de voz de esta nota?')) {
            elements.voiceAttachmentSection.style.display = 'none';
            elements.existingVoiceAttachment.innerHTML = '';
            elements.removeExistingVoiceBtn.style.display = 'none';
            audioBlob = null; // Quita la referencia al audio para que no se guarde
            audioUrl = null;
            seconds = 0;
        }
    });

    // Eventos de la Grabadora de Voz
    elements.openVoiceModalBtn.addEventListener('click', () => {
        resetVoiceRecorder(); // Asegura el estado inicial
        openModal(elements.voiceRecorderModal, 'Grabadora de Voz');
    });
    elements.closeVoiceModalBtn.addEventListener('click', () => closeModal(elements.voiceRecorderModal));
    elements.voiceRecorderModal.addEventListener('click', (e) => {
        if (e.target === elements.voiceRecorderModal) closeModal(elements.voiceRecorderModal);
    });

    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.saveVoiceBtn.addEventListener('click', saveVoiceNote);
    elements.cancelVoiceBtn.addEventListener('click', () => {
        stopRecording();
        resetVoiceRecorder();
        closeModal(elements.voiceRecorderModal);
    });

    // Eventos de las Notas (Delegación de eventos)
    elements.notesContainer.addEventListener('click', (e) => {
        const id = e.target.dataset.id || e.target.closest('button')?.dataset.id;
        if (!id) return;

        if (e.target.closest('.delete-btn')) {
            deleteNote(id);
        } else if (e.target.closest('.edit-btn')) {
            loadNoteForEditing(id);
        } else if (e.target.closest('.favorite-btn')) {
            toggleFavorite(id);
        }
    });

    // Eventos de Búsqueda y Filtro
    elements.searchInput.addEventListener('input', filterNotes);
    elements.categoryFilter.addEventListener('change', filterNotes);
    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.categoryFilter.value = 'all';
        filterNotes();
    });

    // Evento de Modo Oscuro
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // =================================================
    // 9. FUNCIONES DE LÓGICA
    // =================================================

    /** Actualiza los contadores de estadísticas */
    const updateStats = () => {
        elements.totalNotesCount.textContent = notes.length;
        elements.favoriteNotesCount.textContent = notes.filter(n => n.isFavorite).length;
        elements.fileNotesCount.textContent = notes.filter(n => n.files && n.files.length > 0).length;
        elements.voiceNotesCount.textContent = notes.filter(n => n.isVoiceNote).length;
    };

    /** Actualiza la lista de categorías para el filtro y el datalist */
    const updateCategoryFilters = () => {
        const allCategories = notes.map(n => n.category).filter(Boolean);
        const uniqueCategories = [...new Set(allCategories)].sort();

        // Actualizar Filtro (Select)
        elements.categoryFilter.innerHTML = '<option value="all">Todas las Categorías</option>';
        uniqueCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            elements.categoryFilter.appendChild(option);
        });

        // Actualizar Datalist (Input de Categoría en Modal)
        elements.categoriesList.innerHTML = '';
        uniqueCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            elements.categoriesList.appendChild(option);
        });
    };

    /** Lógica de búsqueda y filtrado */
    const filterNotes = () => {
        const searchTerm = elements.searchInput.value.toLowerCase();
        const categoryFilter = elements.categoryFilter.value;

        const filtered = notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(searchTerm);
            const contentMatch = note.content.toLowerCase().includes(searchTerm);
            
            const categoryMatch = categoryFilter === 'all' || note.category === categoryFilter;

            return (titleMatch || contentMatch) && categoryMatch;
        });

        renderNotes(filtered);
    };

    /** Marca/Desmarca una nota como favorita */
    const toggleFavorite = (id) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            note.isFavorite = !note.isFavorite;
            saveNotes();
        }
    };
    
    /** Maneja el cambio de tema (Modo Oscuro/Claro) */
    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        
        // Cambiar icono del botón
        elements.themeToggleBtn.innerHTML = isDarkMode 
            ? '<i class="fas fa-moon"></i>' 
            : '<i class="fas fa-sun"></i>';
    };

    /** Inicializa la aplicación */
    const init = () => {
        // Cargar tema
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            elements.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            elements.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }

        // Cargar y renderizar notas
        saveNotes(); 
    };

    // Iniciar la aplicación
    init();
});