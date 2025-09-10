document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let modules = [];
    let activeModuleId = null;
    let isDirty = false; // Flag to track if there are unsaved changes

    // --- ELEMENT REFERENCES ---
    const appContainer = document.getElementById('app-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const loadDataInput = document.getElementById('load-data-input');
    const startNewBtn = document.getElementById('start-new-btn');
    
    const projectStatus = document.getElementById('project-status');
    const tocList = document.getElementById('toc-list');
    const fileInput = document.getElementById('file-input');
    const addModuleBtn = document.getElementById('add-module-btn');
    const exportBtn = document.getElementById('export-btn');
    const saveDataFileBtn = document.getElementById('save-data-file-btn');
    
    const editorPlaceholder = document.getElementById('editor-placeholder');
    const editorContainer = document.getElementById('editor-container');
    const moduleTitleInput = document.getElementById('module-title-input');
    const moduleContentEditor = document.getElementById('module-content-editor');
    const saveModuleBtn = document.getElementById('save-module-btn');
    const deleteModuleBtn = document.getElementById('delete-module-btn');
    const editorImgBtn = document.getElementById('editor-img-btn');
    const imageUpload = document.getElementById('image-upload');

    // --- CORE FUNCTIONS ---

    function setDirty(state = true) {
        isDirty = state;
        projectStatus.textContent = state ? 'Unsaved changes' : 'All changes saved';
        projectStatus.style.color = state ? '#dc3545' : '#28a745';
    }

    function startApp() {
        welcomeScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    }
    
    // Re-draw the Table of Contents list
    const renderToc = () => {
        tocList.innerHTML = '';
        modules.forEach(module => {
            const listItem = document.createElement('li');
            listItem.dataset.id = module.id;
            listItem.className = module.id === activeModuleId ? 'active' : '';
            listItem.innerHTML = `<span class="drag-handle">☰</span><span class="file-name">${module.title}</span>`;
            listItem.addEventListener('click', () => selectModule(module.id));
            tocList.appendChild(listItem);
        });
    };

    // Show the selected module in the editor panel
    const selectModule = (id) => {
        activeModuleId = id;
        const module = modules.find(m => m.id === id);
        if (module) {
            editorPlaceholder.classList.add('hidden');
            editorContainer.classList.remove('hidden');
            moduleTitleInput.value = module.title;
            moduleContentEditor.innerHTML = module.content;
        } else {
            activeModuleId = null;
            editorPlaceholder.classList.remove('hidden');
            editorContainer.classList.add('hidden');
        }
        renderToc();
    };
    
    // --- EVENT LISTENERS ---

    startNewBtn.addEventListener('click', () => {
        modules = [];
        renderToc();
        selectModule(null);
        startApp();
        projectStatus.textContent = "New Project";
        projectStatus.style.color = '#6c757d';
    });
    
    loadDataInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.match('application/json')) {
            alert('Please select a valid .json file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data.modules)) {
                    modules = data.modules;
                    renderToc();
                    selectModule(null);
                    startApp();
                    setDirty(false);
                    projectStatus.textContent = `Loaded: ${file.name}`;
                } else {
                    throw new Error("Invalid data structure in JSON file.");
                }
            } catch (error) {
                alert(`Error reading file: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset input
    });

    addModuleBtn.addEventListener('click', () => {
        const newModule = {
            id: Date.now().toString(),
            title: 'New Module',
            content: '<p>Start typing your content here...</p>'
        };
        modules.push(newModule);
        renderToc();
        selectModule(newModule.id);
        setDirty();
    });

    fileInput.addEventListener('change', async (event) => {
        for (const file of event.target.files) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            modules.push({
                id: Date.now().toString(),
                title: file.name.replace(/\.docx?$/i, ''),
                content: result.value,
            });
        }
        renderToc();
        setDirty();
        event.target.value = null;
    });

    saveModuleBtn.addEventListener('click', () => {
        if (!activeModuleId) return;
        const moduleIndex = modules.findIndex(m => m.id === activeModuleId);
        if (moduleIndex > -1) {
            modules[moduleIndex].title = moduleTitleInput.value;
            modules[moduleIndex].content = moduleContentEditor.innerHTML;
            renderToc();
            setDirty();
            alert('Changes applied. Remember to "Save Data to File" to make them permanent.');
        }
    });

    deleteModuleBtn.addEventListener('click', () => {
        if (!activeModuleId || !confirm('Are you sure you want to delete this module?')) return;
        modules = modules.filter(m => m.id !== activeModuleId);
        renderToc();
        selectModule(null);
        setDirty();
    });
    
    editorImgBtn.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                moduleContentEditor.appendChild(img);
                setDirty();
            };
            reader.readAsDataURL(file);
        }
        event.target.value = null;
    });

    new Sortable(tocList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const movedItem = modules.splice(evt.oldIndex, 1)[0];
            modules.splice(evt.newIndex, 0, movedItem);
            setDirty();
        }
    });

    // --- DATA & VIEWER EXPORT ---

    saveDataFileBtn.addEventListener('click', () => {
        const content = JSON.stringify({ modules }, null, 2); // Pretty print JSON
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'training_portal_data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDirty(false);
    });
    
    exportBtn.addEventListener('click', async () => {
        if (isDirty) {
            if (!confirm("You have unsaved changes. Are you sure you want to generate the viewer without saving your data file first?")) {
                return;
            }
        }
        if (modules.length === 0) {
            alert('Please add modules before exporting.');
            return;
        }
        exportBtn.textContent = 'Generating...';
        exportBtn.disabled = true;
        try {
            const modulesWithPlainText = modules.map(m => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = m.content;
                return { ...m, plainText: tempDiv.textContent || tempDiv.innerText || "" };
            });
            const viewerCss = generateViewerCss();
            const viewerJs = generateViewerJs();
            const finalHtml = generateSingleFileViewerHtml(modulesWithPlainText, viewerCss, viewerJs);
            const blob = new Blob([finalHtml], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'training-portal.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to generate HTML file:', error);
        } finally {
            exportBtn.textContent = 'Generate & Download Viewer Website';
            exportBtn.disabled = false;
        }
    });

    // Ask for confirmation before leaving the page if there are unsaved changes
    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            event.preventDefault();
            event.returnValue = ''; // Required for legacy browsers
        }
    });
});


// --- TEMPLATE GENERATION FUNCTIONS (Unchanged) ---
function generateSingleFileViewerHtml(modules, css, js) {
    const tocHtml = modules.map((m, index) =>
        `<li><a href="#${m.id}">${index + 1}. ${m.title}</a></li>`
    ).join('');
    const moduleDataScript = `<script>const allModules = ${JSON.stringify(modules)};</script>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Company Training Portal</title><style>${css}</style></head><body><header><h1>Company Training Portal</h1><div class="search-container"><input type="text" id="search-input" placeholder="Search training materials..."></div></header><div class="container"><nav class="sidebar"><h2>Table of Contents</h2><ul>${tocHtml}</ul></nav><main class="content"><div id="search-results"></div><article id="main-content"></article></main></div>${moduleDataScript}<script>${js}</script></body></html>`;
}
function generateViewerJs() {
    return `document.addEventListener('DOMContentLoaded',()=>{const searchInput=document.getElementById('search-input'),resultsContainer=document.getElementById('search-results'),mainContent=document.getElementById('main-content'),tocLinks=document.querySelectorAll('.sidebar ul li a');const displayModule=t=>{const e=allModules.find(e=>e.id===t);e&&(mainContent.innerHTML=\`<h1>\${e.title}</h1>\${e.content}\`,resultsContainer.innerHTML='',resultsContainer.style.display='none',mainContent.style.display='block',tocLinks.forEach(o=>{o.classList.toggle('active',o.getAttribute('href')===\`#\${t}\`)}))};tocLinks.forEach(t=>{t.addEventListener('click',e=>{e.preventDefault();const o=e.currentTarget.getAttribute('href').substring(1);window.location.hash=o,displayModule(o)})}),searchInput.addEventListener('keyup',()=>{const t=searchInput.value.toLowerCase().trim();if(t.length<2)return resultsContainer.style.display='none',void('none'===mainContent.style.display&&(mainContent.style.display='block',displayModule(window.location.hash.substring(1)||allModules[0]?.id)));const e=allModules.filter(e=>e.title.toLowerCase().includes(t)||e.plainText.toLowerCase().includes(t));mainContent.style.display='none',resultsContainer.style.display='block',displayResults(e)});const displayResults=t=>{if(0===t.length)return void(resultsContainer.innerHTML='<h2>Search Results</h2><p>No results found.</p>');const e=t.map(t=>\`<div class="result-item"><h3><a href="#\${t.id}" class="result-link">\${t.title}</a></h3><p>\${t.plainText.substring(0,150)}...</p></div>\`).join('');resultsContainer.innerHTML=\`<h2>Search Results</h2>\${e}\`,document.querySelectorAll('.result-link').forEach(t=>{t.addEventListener('click',e=>{e.preventDefault();const o=e.currentTarget.getAttribute('href').substring(1);window.location.hash=o,displayModule(o)})})};const t=window.location.hash.substring(1);t&&allModules.some(e=>e.id===t)?displayModule(t):allModules.length>0&&(displayModule(allModules[0].id),window.location.hash=allModules[0].id)});`;
}
function generateViewerCss() {
    return `body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background-color:#f4f7f9;color:#333}header{background-color:#fff;padding:1rem 2rem;border-bottom:1px solid #dde3e9;display:flex;justify-content:space-between;align-items:center}header h1{margin:0;font-size:1.5rem;color:#005a9e}.search-container input{width:300px;padding:.5rem .75rem;border-radius:5px;border:1px solid #cdd5de;font-size:1rem}.container{display:flex;max-width:1400px;margin:0 auto;height:calc(100vh - 70px)}.sidebar{width:320px;flex-shrink:0;background-color:#fff;padding:1rem;border-right:1px solid #dde3e9;overflow-y:auto}.sidebar h2{margin-top:0;font-size:1.2rem;border-bottom:1px solid #eee;padding-bottom:.5rem}.sidebar ul{list-style-type:none;padding:0;margin:0}.sidebar ul li a{display:block;padding:.75rem 1rem;text-decoration:none;color:#333;border-radius:5px;transition:background-color .2s}.sidebar ul li a:hover{background-color:#e9f2fa}.sidebar ul li a.active{background-color:#0078d4;color:#fff;font-weight:700}.content{flex-grow:1;padding:2rem 3rem;overflow-y:auto}.content h1,.content h2{color:#005a9e;border-bottom:1px solid #dde3e9;padding-bottom:.5rem}.content img{max-width:100%;height:auto;border-radius:5px;margin:1rem 0}#search-results h2{font-size:1.25rem}.result-item{border:1px solid #dde3e9;background-color:#fff;padding:1rem;margin-bottom:1rem;border-radius:5px}.result-item h3{margin-top:0}.result-item a{text-decoration:none;color:#0078d4}.result-item p{margin-bottom:0;font-size:.9rem;color:#555}`;
}

