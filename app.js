// ==================================================
// Mis Notas App - Versión con Autenticación
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
let auth = null;
let appInstance = null;
let currentUser = null;

// Inicializar Firebase de forma segura
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está cargado');
            showAuthError('Error: Firebase no está disponible');
            return false;
        }

        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        console.log('✅ Firebase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        showAuthError('Error de conexión con la base de datos');
        return false;
    }
}

// Mostrar errores en pantallas de autenticación
function showAuthError(message) {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
        let errorDiv = document.getElementById('authError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'authError';
            errorDiv.className = 'auth-error';
            authContainer.insertBefore(errorDiv, authContainer.querySelector('.auth-form'));
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Función para convertir imagen a Base64 (almacenamiento local)
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Validar tamaño máximo (2MB)
        if (file.size > 2 * 1024 * 1024) {
            reject(new Error('La imagen es muy grande. Máximo 2MB.'));
            return;
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            reject(new Error('Solo se permiten archivos de imagen.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
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

        // Para fechas más antiguas, mostrar fecha completa
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
        this.editingId = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        console.log('🚀 Iniciando Mis Notas App con Autenticación...');
        this.setupAuthStateListener();
        this.setupAuthEventListeners();
        
        if (initializeFirebase()) {
            console.log('✅ Firebase listo, esperando autenticación...');
        }
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Usuario autenticado
                this.handleUserLogin(user);
            } else {
                // Usuario no autenticado
                this.handleUserLogout();
            }
        });
    }

    setupAuthEventListeners() {
        // Login
        this.safeAddEventListener('loginForm', 'submit', (e) => this.handleLogin(e));
        
        // Registro
        this.safeAddEventListener('registerForm', 'submit', (e) => this.handleRegister(e));
        
        // Recuperación de contraseña
        this.safeAddEventListener('forgotPasswordForm', 'submit', (e) => this.handlePasswordReset(e));
        
        // Navegación entre pantallas auth
        this.safeAddEventListener('showRegisterBtn', 'click', () => this.showScreen('registerScreen'));
        this.safeAddEventListener('showLoginBtn', 'click', () => this.showScreen('loginScreen'));
        this.safeAddEventListener('forgotPasswordBtn', 'click', () => this.showScreen('forgotPasswordScreen'));
        this.safeAddEventListener('backToLoginBtn', 'click', () => this.showScreen('loginScreen'));
        
        // Logout
        this.safeAddEventListener('logoutBtn', 'click', () => this.handleLogout());
    }

    showScreen(screenId) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.auth-screen, #appScreen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Mostrar la pantalla solicitada
        document.getElementById(screenId).style.display = 'flex';
        
        // Limpiar errores
        const errorDiv = document.getElementById('authError');
        if (errorDiv) errorDiv.style.display = 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!email || !password) {
            showAuthError('Por favor, completa todos los campos');
            return;
        }

        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = 'Iniciando sesión...';

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Usuario autenticado:', userCredential.user.email);
        } catch (error) {
            console.error('❌ Error en login:', error);
            let errorMessage = 'Error al iniciar sesión';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No existe una cuenta con este correo';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos. Intenta más tarde';
                    break;
            }
            
            showAuthError(errorMessage);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        
        if (!name || !email || !password) {
            showAuthError('Por favor, completa todos los campos');
            return;
        }

        if (password.length < 6) {
            showAuthError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const originalText = registerBtn.textContent;
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creando cuenta...';

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Actualizar perfil del usuario con el nombre
            await user.updateProfile({
                displayName: name
            });
            
            console.log('✅ Usuario registrado:', user.email);
        } catch (error) {
            console.error('❌ Error en registro:', error);
            let errorMessage = 'Error al crear la cuenta';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este correo ya está registrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Operación no permitida';
                    break;
            }
            
            showAuthError(errorMessage);
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetPasswordBtn');
        
        if (!email) {
            showAuthError('Por favor, ingresa tu correo electrónico');
            return;
        }

        const originalText = resetBtn.textContent;
        resetBtn.disabled = true;
        resetBtn.textContent = 'Enviando...';

        try {
            await auth.sendPasswordResetEmail(email);
            showAuthError('✅ Correo enviado. Revisa tu bandeja de entrada.');
            document.getElementById('resetEmail').value = '';
        } catch (error) {
            console.error('❌ Error enviando correo:', error);
            let errorMessage = 'Error al enviar el correo';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No existe una cuenta con este correo';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
            }
            
            showAuthError(errorMessage);
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = originalText;
        }
    }

    handleUserLogin(user) {
        currentUser = user;
        console.log('👤 Usuario logueado:', user.email);
        
        // Actualizar UI
        document.getElementById('userName').textContent = user.displayName || user.email;
        this.showScreen('appScreen');
        
        // Inicializar la app de notas
        this.setupAppEventListeners();
        this.setupNetworkDetection();
        this.checkServiceWorker();
        this.loadNotes();
    }

    handleUserLogout() {
        currentUser = null;
        this.notes = [];
        this.editingId = null;
        console.log('👤 Usuario cerró sesión');
        this.showScreen('loginScreen');
        
        // Limpiar formularios
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        document.getElementById('forgotPasswordForm').reset();
    }

    async handleLogout() {
        try {
            await auth.signOut();
            console.log('✅ Sesión cerrada correctamente');
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
        }
    }

    setupAppEventListeners() {
        // Botón nueva nota
        this.safeAddEventListener('addNoteBtn', 'click', () => this.openModal());
        
        // Botón guardar
        this.safeAddEventListener('saveNoteBtn', 'click', () => this.saveNote());
        
        // Cerrar modal
        this.safeAddEventListener('close', 'click', () => this.closeModal());
        
        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('noteModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Selector de colores
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectColor(e.target);
            });
        });

        // Tecla ESC para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        console.log('✅ Event listeners de app configurados');
    }

    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showStatus('Conectado', 'online');
            console.log('🌐 Conectado a internet');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showStatus('Sin conexión', 'offline');
            console.warn('🔌 Sin conexión a internet');
        });
    }

    showStatus(message, type) {
        let statusBanner = document.getElementById('networkStatus');
        if (!statusBanner) {
            statusBanner = document.createElement('div');
            statusBanner.id = 'networkStatus';
            statusBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusBanner);
        }

        statusBanner.textContent = message;
        statusBanner.style.backgroundColor = type === 'online' ? '#4CAF50' : '#f44336';
        statusBanner.style.color = 'white';

        setTimeout(() => {
            statusBanner.style.transform = 'translateY(-100%)';
        }, 3000);
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

    // Método seguro para agregar event listeners
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Elemento no encontrado: ${elementId}`);
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
        if (!modal) return;

        modal.style.display = 'block';
        
        // Limpiar campos
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content : '';
        document.getElementById('noteImage').value = '';
        
        // Configurar para edición o creación
        if (note) {
            this.editingId = note.id;
            document.querySelector('#noteModal h2').textContent = 'Editar Nota';
            document.getElementById('saveNoteBtn').textContent = 'Actualizar Nota';
            
            // Seleccionar color correcto
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('active');
                if (option.dataset.color === (note.color || 'white')) {
                    option.classList.add('active');
                }
            });
        } else {
            this.editingId = null;
            document.querySelector('#noteModal h2').textContent = 'Nueva Nota';
            document.getElementById('saveNoteBtn').textContent = 'Guardar Nota';
            
            // Color por defecto
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('active');
                if (option.dataset.color === 'white') {
                    option.classList.add('active');
                }
            });
        }

        // Enfocar el título
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
    }

    async saveNote() {
        if (!this.isOnline) {
            alert('⚠️ No hay conexión a internet. Conéctate para guardar notas.');
            return;
        }

        if (!currentUser) {
            alert('❌ Debes iniciar sesión para guardar notas');
            return;
        }

        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const imageFile = document.getElementById('noteImage').files[0];
        const selectedColor = document.querySelector('.color-option.active').dataset.color;

        if (!title) {
            alert('📝 Por favor, escribe un título para tu nota');
            document.getElementById('noteTitle').focus();
            return;
        }

        if (!content) {
            alert('📝 Por favor, escribe el contenido de tu nota');
            document.getElementById('noteContent').focus();
            return;
        }

        const saveBtn = document.getElementById('saveNoteBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            let imageData = null;

            // Convertir imagen a Base64 si existe
            if (imageFile) {
                saveBtn.textContent = 'Procesando imagen...';
                imageData = await imageToBase64(imageFile);
            }

            // Preparar datos
            const noteData = {
                title: title,
                content: content,
                color: selectedColor,
                userId: currentUser.uid, // Guardar ID del usuario
                userEmail: currentUser.email, // Guardar email del usuario
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: new Date().toISOString()
            };

            // Agregar imagen en Base64 si existe
            if (imageData) {
                noteData.imageData = imageData;
                noteData.hasImage = true;
            }

            saveBtn.textContent = 'Guardando en la nube...';

            // Guardar en Firebase bajo la colección del usuario
            if (this.editingId) {
                await db.collection('users').doc(currentUser.uid).collection('notes').doc(this.editingId).update(noteData);
                console.log('✅ Nota actualizada:', this.editingId);
            } else {
                const result = await db.collection('users').doc(currentUser.uid).collection('notes').add(noteData);
                console.log('✅ Nota creada:', result.id);
            }

            this.closeModal();
            this.loadNotes();
            
        } catch (error) {
            console.error('❌ Error guardando nota:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    loadNotes() {
        if (!db || !currentUser) {
            console.error('Firestore o usuario no disponible');
            return;
        }

        // Cargar notas solo del usuario actual
        db.collection('users').doc(currentUser.uid).collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                this.notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                this.displayNotes();
            }, error => {
                console.error('❌ Error cargando notas:', error);
                this.showStatus('Error cargando notas', 'error');
            });
    }

    displayNotes() {
        const container = document.getElementById('notesContainer');
        if (!container) return;
        
        if (this.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                    <h3>No hay notas aún</h3>
                    <p>¡Crea tu primera nota haciendo clic en el botón de arriba!</p>
                    <button onclick="app.openModal()" style="margin-top: 15px;">
                        + Crear Mi Primera Nota
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notes.map(note => `
            <div class="note ${note.color || 'white'}">
                <h3>${this.escapeHtml(note.title)}</h3>
                <p>${this.escapeHtml(note.content)}</p>
                
                ${note.imageData ? `
                    <img src="${note.imageData}" alt="Imagen de la nota" class="note-image" 
                         onerror="this.style.display='none'">
                ` : ''}
                
                <div class="note-meta">
                    <small>${formatNoteTimestamp(note.timestamp)}</small>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" onclick="app.editNote('${note.id}')">✏️ Editar</button>
                    <button class="delete-btn" onclick="app.deleteNote('${note.id}')">🗑️ Eliminar</button>
                </div>
            </div>
        `).join('');
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
            await db.collection('users').doc(currentUser.uid).collection('notes').doc(noteId).delete();
            console.log('✅ Nota eliminada:', noteId);
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
    console.log('📱 Mis Notas App con Autenticación - Inicializando...');
    appInstance = new NotesApp();
    window.app = appInstance;
});

// Estilos adicionales para los nuevos elementos
const additionalStyles = `
    .auth-screen {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
    }
    
    .auth-container {
        background: white;
        padding: 40px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        width: 100%;
        max-width: 400px;
    }
    
    .auth-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .auth-header h1 {
        color: #333;
        margin-bottom: 10px;
    }
    
    .auth-header p {
        color: #666;
    }
    
    .auth-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .auth-form input {
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
        transition: border-color 0.3s;
    }
    
    .auth-form input:focus {
        border-color: #4CAF50;
        outline: none;
    }
    
    .auth-form button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .auth-form button:hover {
        background-color: #45a049;
    }
    
    .auth-form button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    .auth-links {
        text-align: center;
        margin-top: 20px;
    }
    
    .link-btn {
        background: none;
        border: none;
        color: #4CAF50;
        cursor: pointer;
        text-decoration: underline;
        margin: 5px;
    }
    
    .link-btn:hover {
        color: #45a049;
    }
    
    .auth-error {
        background: #ffebee;
        color: #c62828;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
        text-align: center;
        border: 1px solid #ffcdd2;
    }
    
    .user-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }
    
    .user-menu {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .user-menu span {
        color: #666;
        font-weight: bold;
    }
    
    #logoutBtn {
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
    }
    
    #logoutBtn:hover {
        background: #d32f2f;
    }
    
    .error-message {
        text-align: center;
        padding: 40px 20px;
        background: #ffebee;
        border: 2px solid #f44336;
        border-radius: 10px;
        margin: 20px;
    }
    
    .error-message button {
        background: #f44336;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 15px;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .empty-state button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
    }
    
    .note-actions button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
`;

// Injectar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

console.log('🎉 Mis Notas App con Autenticación - Código cargado');