document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let projectTitle = 'Company Training Portal';
    let modules = [];
    let activeModuleId = null;
    let isDirty = false; // Flag to track if there are unsaved changes

    // --- ELEMENT REFERENCES ---
    const appContainer = document.getElementById('app-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const loadDataInput = document.getElementById('load-data-input');
    const startNewBtn = document.getElementById('start-new-btn');
    
    const projectStatus = document.getElementById('project-status');
    const projectTitleInput = document.getElementById('project-title-input');
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
    const imageUpload = document.getElementById('image-upload');
    const wysiwygToolbar = document.getElementById('wysiwyg-toolbar');

    // --- CORE FUNCTIONS ---

    function setDirty(state = true) {
        isDirty = state;
        projectStatus.textContent = state ? 'Unsaved changes' : 'All changes saved';
        projectStatus.style.color = state ? 'var(--danger-color)' : 'var(--success-color)';
    }

    function startApp() {
        welcomeScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    }
    
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
        if (isDirty && !confirm("You have unsaved changes. Are you sure you want to start a new project?")) {
            return;
        }
        projectTitle = 'Company Training Portal';
        modules = [];
        projectTitleInput.value = projectTitle;
        renderToc();
        selectModule(null);
        startApp();
        projectStatus.textContent = "New Project";
        projectStatus.style.color = 'var(--text-secondary)';
        setDirty(false);
    });
    
    loadDataInput.addEventListener('change', (event) => {
        if (isDirty && !confirm("You have unsaved changes that will be lost. Are you sure you want to load a new file?")) {
            return;
        }
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
                    projectTitle = data.projectTitle || 'Company Training Portal';
                    modules = data.modules;
                    projectTitleInput.value = projectTitle;
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
        event.target.value = null;
    });
    
    projectTitleInput.addEventListener('input', () => setDirty());

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
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                modules.push({
                    id: Date.now().toString(),
                    title: file.name.replace(/\.docx?$/i, ''),
                    content: result.value,
                });
            } catch (error) {
                console.error("Error converting DOCX:", error);
                alert(`Could not process the file: ${file.name}`);
            }
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

    // --- WYSIWYG Editor & Image Upload Logic ---
    wysiwygToolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.toolbar-btn');
        if (!button) return;

        e.preventDefault();
        const command = button.dataset.command;

        if (command === 'createLink') {
            const url = prompt("Enter the URL:");
            if (url) document.execCommand(command, false, url);
        } else if (command === 'insertImage') {
            imageUpload.click();
        } else if (command === 'insertTable') {
            const rows = parseInt(prompt("Enter number of rows:", "2"), 10);
            const cols = parseInt(prompt("Enter number of columns:", "2"), 10);
            if (rows > 0 && cols > 0) insertTable(rows, cols);
        } else {
            document.execCommand(command, false, null);
        }
        moduleContentEditor.focus();
    });

    function insertTable(rows, cols) {
        let tableHtml = '<table style="width:100%; border-collapse: collapse;"><thead><tr>';
        for(let i = 0; i < cols; i++) {
            tableHtml += '<th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Header</th>';
        }
        tableHtml += '</tr></thead><tbody>';
        for (let i = 0; i < rows; i++) {
            tableHtml += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;"><p><br></p></td>';
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';
        document.execCommand('insertHTML', false, tableHtml);
    }

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgHtml = `<img src="${e.target.result}" style="max-width: 100%; height: auto;">`;
                document.execCommand('insertHTML', false, imgHtml);
                setDirty();
            };
            reader.readAsDataURL(file);
        }
        event.target.value = null;
    });

    function updateToolbar() {
        const commands = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
        commands.forEach(command => {
            const button = wysiwygToolbar.querySelector(`[data-command="${command}"]`);
            if (button) button.classList.toggle('active', document.queryCommandState(command));
        });
    }

    document.addEventListener('selectionchange', updateToolbar);
    moduleContentEditor.addEventListener('keyup', updateToolbar);
    moduleContentEditor.addEventListener('click', updateToolbar);

    // --- DATA & VIEWER EXPORT ---
    saveDataFileBtn.addEventListener('click', () => {
        if (modules.length === 0 && projectTitleInput.value.trim() === '') {
            alert("There is no data to save.");
            return;
        }
        projectTitle = projectTitleInput.value;
        const content = JSON.stringify({ projectTitle, modules }, null, 2);
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
        if (isDirty && !confirm("You have unsaved changes. Are you sure you want to generate the viewer without saving your data file first?")) return;
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
            const finalHtml = generateSingleFileViewerHtml(projectTitleInput.value, modulesWithPlainText, viewerCss, viewerJs);
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

    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
});

// --- TEMPLATE GENERATION FUNCTIONS ---
function generateSingleFileViewerHtml(title, modules, css, js) {
    const tocHtml = modules.map((m, index) =>
        `<li><a href="#${m.id}">${index + 1}. ${m.title}</a></li>`
    ).join('');
    const moduleDataScript = `<script>const allModules = ${JSON.stringify(modules)};</script>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${css}</style></head><body><header><h1>${title}</h1><div class="search-container"><input type="text" id="search-input" placeholder="Search training materials..."></div></header><div class="container"><nav class="sidebar"><h2>Table of Contents</h2><ul>${tocHtml}</ul></nav><main class="content"><div id="search-results"></div><article id="main-content"></article></main></div>${moduleDataScript}<script>${js}</script></body></html>`;
}

function generateViewerJs() {
    return `
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');
        const mainContent = document.getElementById('main-content');
        const tocLinks = document.querySelectorAll('.sidebar ul li a');

        const displayModule = (moduleId) => {
            const module = allModules.find(m => m.id === moduleId);
            if (module) {
                mainContent.innerHTML = \`<h1>\${module.title}</h1>\${module.content}\`;
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                mainContent.style.display = 'block';

                tocLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === \`#\${moduleId}\`);
                });
                makeTablesResizable();
                setupImageZoom();
            }
        };

        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleId = e.currentTarget.getAttribute('href').substring(1);
                window.location.hash = moduleId;
                displayModule(moduleId);
            });
        });

        searchInput.addEventListener('keyup', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                if(mainContent.style.display === 'none') {
                    mainContent.style.display = 'block';
                    const currentId = window.location.hash.substring(1) || (allModules[0] ? allModules[0].id : null);
                    if(currentId) displayModule(currentId);
                }
                return;
            }
            const results = allModules.filter(m => 
                m.title.toLowerCase().includes(query) || 
                m.plainText.toLowerCase().includes(query)
            );
            mainContent.style.display = 'none';
            resultsContainer.style.display = 'block';
            displayResults(results);
        });

        const displayResults = (results) => {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<h2>Search Results</h2><p>No results found.</p>';
                return;
            }
            const html = results.map(item => \`
                <div class="result-item">
                    <h3><a href="#\${item.id}" class="result-link">\${item.title}</a></h3>
                    <p>\${item.plainText.substring(0, 150)}...</p>
                </div>
            \`).join('');
            resultsContainer.innerHTML = \`<h2>Search Results</h2>\${html}\`;
            document.querySelectorAll('.result-link').forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const moduleId = e.currentTarget.getAttribute('href').substring(1);
                    window.location.hash = moduleId;
                    displayModule(moduleId);
                });
            });
        };

        const makeTablesResizable = () => {
            document.querySelectorAll('.content table').forEach(table => {
                const headers = table.querySelectorAll('th');
                headers.forEach(header => {
                    const resizeHandle = document.createElement('div');
                    resizeHandle.className = 'resize-handle';
                    header.appendChild(resizeHandle);
                    resizeHandle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        let startX = e.pageX;
                        let startWidth = header.offsetWidth;
                        const mouseMoveHandler = (moveEvent) => {
                            const newWidth = startWidth + (moveEvent.pageX - startX);
                            if (newWidth > 40) {
                                header.style.width = \`\${newWidth}px\`;
                            }
                        };
                        const mouseUpHandler = () => {
                            document.removeEventListener('mousemove', mouseMoveHandler);
                            document.removeEventListener('mouseup', mouseUpHandler);
                        };
                        document.addEventListener('mousemove', mouseMoveHandler);
                        document.addEventListener('mouseup', mouseUpHandler);
                    });
                });
            });
        };

        const setupImageZoom = () => {
            document.querySelectorAll('.content article img').forEach(img => {
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => createZoomModal(img));
            });
        };
        
        const createZoomModal = (imgElement) => {
            if (document.querySelector('.zoom-modal')) return;

            const modal = document.createElement('div');
            modal.className = 'zoom-modal';
            
            const img = document.createElement('img');
            img.src = imgElement.src;
            
            modal.appendChild(img);
            document.body.appendChild(modal);

            requestAnimationFrame(() => modal.classList.add('visible'));

            let scale = 1, panning = false, pointX = 0, pointY = 0, start = { x: 0, y: 0 };

            const setTransform = () => {
                img.style.transform = \`translate(\${pointX}px, \${pointY}px) scale(\${scale})\`;
            }

            const zoom = (e, zoomIn) => {
                e.preventDefault();
                const rect = img.getBoundingClientRect();
                const xs = (e.clientX - rect.left) / rect.width;
                const ys = (e.clientY - rect.top) / rect.height;
                const newScale = scale * (zoomIn ? 1.2 : 1 / 1.2);
                
                if (newScale >= 1) {
                    pointX = (1 - newScale / scale) * (xs * rect.width) + pointX;
                    pointY = (1 - newScale / scale) * (ys * rect.height) + pointY;
                    scale = newScale;
                } else {
                    scale = 1;
                    pointX = 0;
                    pointY = 0;
                }
                setTransform();
            };

            const onKeyDown = (e) => {
                if (e.key === 'Escape') closeModal();
                if (e.key === 'Alt') {
                    img.style.cursor = 'zoom-out';
                }
            };
            
            const onKeyUp = (e) => {
                 if (e.key === 'Alt') {
                    img.style.cursor = 'zoom-in';
                }
            };

            img.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left click
                    zoom(e, !e.altKey);
                } else if (e.button === 1) { // Middle click
                    e.preventDefault();
                    start = { x: e.clientX - pointX, y: e.clientY - pointY };
                    panning = true;
                    img.style.cursor = 'grabbing';
                }
            });

            img.addEventListener('mouseup', (e) => {
                if(e.button === 1) {
                    panning = false;
                    img.style.cursor = e.altKey ? 'zoom-out' : 'zoom-in';
                }
            });

            modal.addEventListener('mousemove', (e) => {
                if (!panning) return;
                pointX = (e.clientX - start.x);
                pointY = (e.clientY - start.y);
                setTransform();
            });
            
            const closeModal = () => {
                modal.classList.remove('visible');
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                setTimeout(() => modal.remove(), 300);
            };
            
            // Prevent context menu on right-click inside modal
            modal.addEventListener('contextmenu', e => e.preventDefault());

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            
            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('keyup', onKeyUp);
        };

        const initialModuleId = window.location.hash.substring(1);
        if (initialModuleId && allModules.some(m => m.id === initialModuleId)) {
            displayModule(initialModuleId);
        } else if (allModules.length > 0) {
            displayModule(allModules[0].id);
            window.location.hash = allModules[0].id;
        }
    });
    `;
}

function generateViewerCss() {
    return `
    :root {
        --primary-color: #007bff;
        --border-color: #dee2e6;
        --background-light: #f8f9fa;
        --background-white: #ffffff;
        --text-primary: #212529;
        --text-secondary: #6c757d;
    }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background-color:#f4f7f9;color: var(--text-primary)}
    header{background-color:var(--background-white);padding:1rem 2rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center}
    header h1{margin:0;font-size:1.5rem;color:#005a9e}
    .search-container input{width:300px;padding:.5rem .75rem;border-radius:5px;border:1px solid #cdd5de;font-size:1rem}
    .container{display:flex;max-width:1600px;margin:0 auto;height:calc(100vh - 70px)}
    .sidebar{width:320px;flex-shrink:0;background-color:var(--background-white);padding:1rem;border-right:1px solid var(--border-color);overflow-y:auto}
    .sidebar h2{margin-top:0;font-size:1.2rem;border-bottom:1px solid #eee;padding-bottom:.5rem}
    .sidebar ul{list-style-type:none;padding:0;margin:0}
    .sidebar ul li a{display:block;padding:.75rem 1rem;text-decoration:none;color:var(--text-primary);border-radius:5px;transition:background-color .2s}
    .sidebar ul li a:hover{background-color:#e9f2fa}
    .sidebar ul li a.active{background-color:var(--primary-color);color:#fff;font-weight:700}
    .content{flex-grow:1;padding:2rem 3rem;overflow-y:auto; position: relative;}
    .content h1,.content h2{color:#005a9e;border-bottom:1px solid var(--border-color);padding-bottom:.5rem}
    .content img{max-width:100%;height:auto;border-radius:5px;margin:1rem 0;display: block; cursor: zoom-in;}
    #search-results h2{font-size:1.25rem}
    .result-item{border:1px solid var(--border-color);background-color:var(--background-white);padding:1rem;margin-bottom:1rem;border-radius:5px}
    .result-item h3{margin-top:0}.result-item a{text-decoration:none;color:var(--primary-color)}
    .result-item p{margin-bottom:0;font-size:.9rem;color:var(--text-secondary)}
    .content table{border-collapse:collapse;width:100%;table-layout:fixed}
    .content th{position:relative}
    .resize-handle{position:absolute;top:0;right:-2.5px;width:5px;height:100%;cursor:col-resize;user-select:none; z-index: 10;}
    #module-content-editor table{border-collapse:collapse;width:100%;margin:1rem 0}
    #module-content-editor th, #module-content-editor td {border:1px solid #ccc;padding:8px;text-align:left}
    #module-content-editor th{background-color:#f2f2f2}
    .zoom-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:1000;opacity:0;transition:opacity .3s ease;overflow:hidden;}
    .zoom-modal.visible{opacity:1}
    .zoom-modal img{max-width:95%;max-height:95%;object-fit:contain;transition:transform 0.1s linear;border:2px solid white; border-radius: 5px; cursor: zoom-in;}
    .zoom-modal::after{content:'×';position:fixed;top:15px;right:25px;font-size:3rem;color:white;cursor:pointer;font-weight:200;}
    `;
}

