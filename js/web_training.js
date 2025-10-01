document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let projectTitle = 'Company Training Portal';
    let modules = [];
    let activeModuleId = null;
    let isDirty = false;
    let savedSelection = null; // To store editor selection range

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
    const addSubmoduleBtn = document.getElementById('add-submodule-btn');
    const moduleContentEditor = document.getElementById('module-content-editor');
    const saveModuleBtn = document.getElementById('save-module-btn');
    const deleteModuleBtn = document.getElementById('delete-module-btn');
    const imageUpload = document.getElementById('image-upload');
    const wysiwygToolbar = document.getElementById('wysiwyg-toolbar');

    // --- HELPER FUNCTIONS ---
    const findModuleById = (id, list = modules) => {
        for (const module of list) {
            if (module.id === id) return { module, parentList: list };
            if (module.submodules) {
                const found = findModuleById(id, module.submodules);
                if (found) return found;
            }
        }
        return null;
    };

    const setDirty = (state = true) => {
        isDirty = state;
        projectStatus.textContent = state ? 'Unsaved changes' : 'All changes saved';
        projectStatus.style.color = state ? 'var(--danger-color)' : 'var(--success-color)';
    };

    const startApp = () => {
        welcomeScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    };

    // --- CORE RENDERING & SELECTION ---
    const renderToc = (list = modules, container = tocList) => {
        if (container === tocList) container.innerHTML = ''; // Clear only the root list
        list.forEach(module => {
            const listItem = document.createElement('li');
            listItem.dataset.id = module.id;
            
            const itemContent = document.createElement('div');
            itemContent.className = 'toc-item-content';
            
            let toggleHtml = '';
            // Show toggle only if submodules exist.
            if (module.submodules && module.submodules.length > 0) {
                toggleHtml = `<span class="toggle ${module.collapsed ? 'collapsed' : ''}"></span>`;
            } else {
                 toggleHtml = `<span class="toggle" style="visibility: hidden;"></span>`;
            }

            itemContent.innerHTML = `
                ${toggleHtml}
                <span class="drag-handle">☰</span>
                <span class="file-name">${module.title}</span>
            `;
            
            listItem.appendChild(itemContent);
            container.appendChild(listItem);

            // Click listener for selecting the module (on the filename)
            itemContent.querySelector('.file-name').addEventListener('click', () => selectModule(module.id));
            
            // Click listener for toggling
            const toggle = itemContent.querySelector('.toggle');
            if (toggle.style.visibility !== 'hidden') {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    module.collapsed = !module.collapsed;
                    renderToc();
                });
            }

            // Highlight the active module
            if (module.id === activeModuleId) {
                itemContent.classList.add('active');
            }

            // Render sub-modules
            if (module.submodules) {
                const sublist = document.createElement('ul');
                sublist.className = `sortable-list ${module.collapsed ? 'collapsed' : ''}`;
                listItem.appendChild(sublist);
                renderToc(module.submodules, sublist);
            }
        });
        if (container === tocList) initializeSortables();
    };
    
    const selectModule = (id) => {
        activeModuleId = id;
        const result = findModuleById(id);
        if (result) {
            const { module } = result;
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
        if (isDirty && !confirm("You have unsaved changes. Start new?")) return;
        projectTitle = 'Company Training Portal';
        modules = [];
        projectTitleInput.value = projectTitle;
        renderToc();
        selectModule(null);
        startApp();
        setDirty(false);
    });

    loadDataInput.addEventListener('change', (event) => {
        if (isDirty && !confirm("Unsaved changes will be lost. Load file?")) return;
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                projectTitle = data.projectTitle || 'Company Training Portal';
                modules = data.modules || [];
                projectTitleInput.value = projectTitle;
                renderToc();
                selectModule(null);
                startApp();
                setDirty(false);
            } catch (error) { alert(`Error reading file: ${error.message}`); }
        };
        reader.readAsText(file);
        event.target.value = null;
    });

    projectTitleInput.addEventListener('input', () => setDirty());

    addModuleBtn.addEventListener('click', () => {
        const newModule = { id: Date.now().toString(), title: 'New Module', content: '<p></p>', submodules: [], collapsed: false };
        modules.push(newModule);
        renderToc();
        selectModule(newModule.id);
        setDirty();
    });
    
    if(addSubmoduleBtn) {
        addSubmoduleBtn.addEventListener('click', () => {
            if (!activeModuleId) {
                alert("Please select a parent module first.");
                return;
            }
            const result = findModuleById(activeModuleId);
            if(result) {
                const newModule = { id: Date.now().toString(), title: 'New Sub-module', content: '<p></p>', submodules: [], collapsed: false };
                if (!result.module.submodules) result.module.submodules = [];
                result.module.submodules.push(newModule);
                result.module.collapsed = false; // Ensure parent is expanded
                renderToc();
                selectModule(newModule.id);
                setDirty();
            }
        });
    }

    saveModuleBtn.addEventListener('click', () => {
        if (!activeModuleId) return;
        const result = findModuleById(activeModuleId);
        if (result) {
            result.module.title = moduleTitleInput.value;
            result.module.content = moduleContentEditor.innerHTML;
            renderToc();
            setDirty();
            alert('Changes applied.');
        }
    });

    deleteModuleBtn.addEventListener('click', () => {
        if (!activeModuleId || !confirm('Delete this module and all its sub-modules?')) return;
        const result = findModuleById(activeModuleId);
        if (result) {
            const index = result.parentList.findIndex(m => m.id === activeModuleId);
            result.parentList.splice(index, 1);
            renderToc();
            selectModule(null);
            setDirty();
        }
    });
    
    // --- DRAG AND DROP (SortableJS) ---
    function initializeSortables() {
        document.querySelectorAll('#toc-list, #toc-list ul').forEach(list => {
            if(list.sortable) list.sortable.destroy();
            new Sortable(list, {
                group: 'nested',
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const itemId = evt.item.dataset.id;
                    const newParentEl = evt.to.closest('li');
                    
                    const oldLocation = findModuleById(itemId);
                    if (!oldLocation) return;
                    const item = oldLocation.parentList.splice(oldLocation.parentList.findIndex(m => m.id === itemId), 1)[0];

                    if (newParentEl) {
                        const parentId = newParentEl.dataset.id;
                        const newParentResult = findModuleById(parentId);
                        if(newParentResult) {
                            const newParent = newParentResult.module;
                            if (!newParent.submodules) newParent.submodules = [];
                            newParent.submodules.splice(evt.newIndex, 0, item);
                        }
                    } else {
                        modules.splice(evt.newIndex, 0, item);
                    }
                    renderToc();
                    setDirty();
                }
            });
        });
    }

    // --- WYSIWYG & UPLOAD ---
    wysiwygToolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.toolbar-btn');
        if (!button) return;
        e.preventDefault();
        const command = button.dataset.command;
        if (command === 'createLink') {
            const url = prompt("Enter URL:");
            if (url) document.execCommand(command, false, url);
        } else if (command === 'insertModuleLink') {
            openModuleLinkModal();
        } else if (command === 'highlightColor') { // Re-added logic for custom palette
            toggleColorPalette(button);
        } else if (command === 'insertImage') {
            imageUpload.click();
        } else if (command === 'insertTable') {
            const rows = parseInt(prompt("Rows:", "2"), 10);
            const cols = parseInt(prompt("Columns:", "2"), 10);
            if (rows > 0 && cols > 0) insertTable(rows, cols);
        } else {
            document.execCommand(command, false, null);
        }
        moduleContentEditor.focus();
    });
    
    // Save selection when editor loses focus
    moduleContentEditor.addEventListener('blur', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedSelection = selection.getRangeAt(0);
        }
    });

    const fontSizeSelector = document.getElementById('font-size-selector');
    if(fontSizeSelector) {
        fontSizeSelector.addEventListener('change', (e) => {
            const size = e.target.value;
            if (size) {
                document.execCommand('styleWithCSS', false, false);
                document.execCommand('fontSize', false, size);
                document.execCommand('styleWithCSS', false, true);
            }
            e.target.value = "";
            moduleContentEditor.focus();
        });
    }

    function insertTable(rows, cols) {
        let tableHtml = '<table style="width:100%; border-collapse: collapse;"><thead><tr>';
        for(let i = 0; i < cols; i++) tableHtml += `<th style="border: 1px solid #ccc; padding: 8px;">Header ${i+1}</th>`;
        tableHtml += '</tr></thead><tbody>';
        for (let i = 0; i < rows; i++) {
            tableHtml += '<tr>';
            for (let j = 0; j < cols; j++) tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;"><p><br></p></td>';
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';
        document.execCommand('insertHTML', false, tableHtml);
    }

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgHtml = `<img src="${e.target.result}" style="max-width: 100%; height: auto;">`;
            document.execCommand('insertHTML', false, imgHtml);
            setDirty();
        };
        reader.readAsDataURL(file);
        event.target.value = null;
    });

    // --- Module Link Modal ---
    function openModuleLinkModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        modalContent.innerHTML = '<h3>Link to a Module</h3><ul class="module-link-list"></ul>';
        
        const listContainer = modalContent.querySelector('.module-link-list');
        
        const buildLinkList = (list, container) => {
            list.forEach(module => {
                const li = document.createElement('li');
                li.textContent = module.title;
                li.dataset.id = module.id;
                li.dataset.title = module.title;
                container.appendChild(li);
                if (module.submodules && module.submodules.length > 0) {
                    const subUl = document.createElement('ul');
                    li.appendChild(subUl);
                    buildLinkList(module.submodules, subUl);
                }
            });
        };
        
        buildLinkList(modules, listContainer);
        
        listContainer.addEventListener('click', (e) => {
            const targetLi = e.target.closest('li');
            if(targetLi) {
                insertModuleLink(targetLi.dataset.id, targetLi.dataset.title);
                document.body.removeChild(modalOverlay);
            }
        });
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    }

    function insertModuleLink(id, title) {
        moduleContentEditor.focus();
        if (savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelection);
        }

        const selection = window.getSelection();
        let linkText = selection.toString();
        if (!linkText) {
            linkText = title;
        }
        
        const linkHtml = `<a href="#${id}" data-module-link="true">${linkText}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        setDirty();
    }
    
    // Re-added functions for custom color palette
    function toggleColorPalette(button) {
        const existingPalette = document.querySelector('.color-palette-popup');
        if (existingPalette) {
            existingPalette.remove();
            return;
        }

        const palette = document.createElement('div');
        palette.className = 'color-palette-popup';
        const colors = ['#FFFF00', '#FFD700', '#ADFF2F', '#00FF00', '#00FFFF', '#87CEEB', '#FFB6C1', '#FFA07A'];
        
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => {
                applyHighlight(color);
                palette.remove();
            });
            palette.appendChild(swatch);
        });

        button.appendChild(palette);
        
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!palette.contains(e.target) && !button.contains(e.target)) {
                    palette.remove();
                }
            }, { once: true });
        }, 0);
    }

    function applyHighlight(color) {
        if (savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelection);
        }
        document.execCommand('backColor', false, color);
        moduleContentEditor.focus();
    }


    // --- DATA & VIEWER EXPORT ---
    saveDataFileBtn.addEventListener('click', () => {
        projectTitle = projectTitleInput.value;
        const content = JSON.stringify({ projectTitle, modules }, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'training_portal_data.json';
        link.click();
        setDirty(false);
    });
    
    exportBtn.addEventListener('click', () => {
        if (isDirty && !confirm("Unsaved changes exist. Generate viewer anyway?")) return;
        if (modules.length === 0) return alert('Please add modules first.');
        
        const flattenedModules = [];
        const flatten = (list) => {
            list.forEach(m => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = m.content;
                flattenedModules.push({ ...m, plainText: tempDiv.textContent || "" });
                if (m.submodules) flatten(m.submodules);
            });
        };
        flatten(modules);

        const viewerCss = generateViewerCss();
        const viewerJs = generateViewerJs();
        const finalHtml = generateSingleFileViewerHtml(projectTitleInput.value, modules, flattenedModules, viewerCss, viewerJs);
        
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'training-portal.html';
        link.click();
    });

    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    
    initializeSortables();
});

// --- TEMPLATE GENERATION FUNCTIONS (for the exported viewer file) ---
function generateSingleFileViewerHtml(title, tocModules, allModulesData, css, js) {
    const generateTocHtml = (list) => {
        let html = '<ul>';
        list.forEach((m) => {
            const hasSubmodules = m.submodules && m.submodules.length > 0;
            html += `<li class="${hasSubmodules ? '' : 'no-children'} ${m.collapsed ? 'collapsed' : ''}">`;
            if (hasSubmodules) {
                 html += `<span class="toggle"></span>`;
            }
            html += `<a href="#${m.id}">${m.title}</a>`;
            if (hasSubmodules) {
                html += generateTocHtml(m.submodules);
            }
            html += '</li>';
        });
        html += '</ul>';
        return html;
    };
    const tocHtml = generateTocHtml(tocModules);
    const moduleDataScript = `<script>const allModules = ${JSON.stringify(allModulesData)};</script>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${css}</style></head><body><header><h1>${title}</h1><div class="search-container"><input type="text" id="search-input" placeholder="Search..."><div id="suggestions-box"></div></div></header><div class="container"><nav class="sidebar"><h2>Table of Contents</h2><div class="toc-container">${tocHtml}</div></nav><main class="content"><div id="search-results"></div><article id="main-content"></article></main></div>${moduleDataScript}<script>${js}</script></body></html>`;
}

function generateViewerJs() {
    return `
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('search-input');
        const suggestionsBox = document.getElementById('suggestions-box');
        const resultsContainer = document.getElementById('search-results');
        const mainContent = document.getElementById('main-content');
        const tocContainer = document.querySelector('.sidebar .toc-container');

        const displayModule = (moduleId) => {
            const module = allModules.find(m => m.id === moduleId);
            if (module) {
                mainContent.innerHTML = \`<h1>\${module.title}</h1>\${module.content}\`;
                resultsContainer.style.display = 'none';
                mainContent.style.display = 'block';
                tocContainer.querySelectorAll('a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === \`#\${moduleId}\`) {
                        link.classList.add('active');
                        // Expand parents
                        let parent = link.parentElement.parentElement.closest('li');
                        while(parent) {
                            parent.classList.remove('collapsed');
                            parent = parent.parentElement.closest('li');
                        }
                    }
                });
                setupImageZoom();
            }
        };

        const highlightText = (text, query) => {
            if (!query) return text;
            const regex = new RegExp(query.replace(/[.*+?^\\\${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
            return text.replace(regex, (match) => \`<mark>\${match}</mark>\`);
        };

        tocContainer.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            const toggle = e.target.closest('.toggle');

            if (link) {
                e.preventDefault();
                const moduleId = link.getAttribute('href').substring(1);
                window.location.hash = moduleId;
                displayModule(moduleId);
            }
            if (toggle) {
                toggle.parentElement.classList.toggle('collapsed');
            }
        });
        
        // ADDED: Listener for internal module links
        mainContent.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-module-link="true"]');
            if (link) {
                e.preventDefault();
                const moduleId = link.getAttribute('href').substring(1);
                window.location.hash = moduleId;
                displayModule(moduleId);
            }
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (query.length < 2) {
                suggestionsBox.style.display = 'none';
                return;
            }
            const suggestions = allModules
                .filter(m => m.title.toLowerCase().includes(query))
                .slice(0, 5);
            
            if (suggestions.length > 0) {
                suggestionsBox.innerHTML = suggestions.map(s => \`<div data-id="\${s.id}">\${highlightText(s.title, query)}</div>\`).join('');
                suggestionsBox.style.display = 'block';
            } else {
                suggestionsBox.style.display = 'none';
            }
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.toLowerCase().trim();
                suggestionsBox.style.display = 'none';
                if(query.length < 2) return;
                const results = allModules.filter(m => m.title.toLowerCase().includes(query) || m.plainText.toLowerCase().includes(query));
                mainContent.style.display = 'none';
                resultsContainer.style.display = 'block';
                displayResults(results, query);
            }
        });

        suggestionsBox.addEventListener('click', (e) => {
            const target = e.target.closest('[data-id]');
            if (target) {
                const moduleId = target.dataset.id;
                window.location.hash = moduleId;
                displayModule(moduleId);
                suggestionsBox.style.display = 'none';
                searchInput.value = '';
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                suggestionsBox.style.display = 'none';
            }
        });

        const displayResults = (results, query) => {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<h2>Search Results</h2><p>No results found.</p>';
                return;
            }
            const html = results.map(item => \`
                <div class="result-item">
                    <h3><a href="#\${item.id}" class="result-link">\${highlightText(item.title, query)}</a></h3>
                    <p>\${highlightText(item.plainText.substring(0, 250), query)}...</p>
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
            const firstModuleLink = document.querySelector('.sidebar .toc-container ul a');
            if (firstModuleLink) {
                 const firstModuleId = firstModuleLink.getAttribute('href').substring(1);
                 displayModule(firstModuleId);
                 window.location.hash = firstModuleId;
            }
        }
    });
    `;
}
function generateViewerCss() {
    return `
    :root { --primary-color: #007bff; --border-color: #dee2e6; --text-primary: #212529; }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background-color:#f4f7f9;color: var(--text-primary);}
    header{background-color:white;padding:1rem 2rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center}
    header h1{margin:0;font-size:1.5rem;color:#005a9e}
    .search-container{position:relative; width: 300px;}
    .search-container input{width:100%;padding:.5rem .75rem;border-radius:5px;border:1px solid #cdd5de;font-size:1rem; box-sizing: border-box;}
    #suggestions-box{display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid var(--border-color);border-top:none;border-radius:0 0 5px 5px;z-index:100; max-height: 300px; overflow-y: auto;}
    #suggestions-box div{padding:0.75rem;cursor:pointer;}
    #suggestions-box div:hover{background-color:#e9f2fa;}
    #suggestions-box mark{background: #fff3cd; padding: 0; font-weight: bold; color: inherit;}
    .container{display:flex;max-width:100%;margin:0 auto;height:calc(100vh - 70px)}
    .sidebar{width:280px;flex-shrink:0;background-color:white;padding: 1rem 0.5rem;border-right:1px solid var(--border-color);overflow-y:auto}
    .sidebar h2{margin-top:0;font-size:1.2rem;border-bottom:1px solid #eee;padding-bottom:.5rem}
    .sidebar ul{list-style-type:none;padding-left: 1.2rem; margin:0; border-left: 1px solid #e9ecef;}
    .sidebar .toc-container > ul {padding-left: 0; border-left: none;}
    .sidebar li { position: relative; }
    .sidebar li a{display:inline-block;padding:.2rem .4rem;text-decoration:none;color:var(--text-primary);border-radius:5px;transition:background-color .2s; margin-left: 5px;}
    .sidebar li a:hover{background-color:#e9f2fa}
    .sidebar li a.active{background-color:var(--primary-color);color:#fff;font-weight:700}
    .sidebar .toggle { position: absolute; left: -8px; top: 4px; cursor: pointer; width: 16px; height: 16px; transition: transform 0.2s ease; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc;}
    .sidebar .toggle::before { content: '−'; font-size: 14px; color: #555; line-height: 1;}
    .sidebar li.collapsed > .toggle::before { content: '+'; }
    .sidebar li.no-children > .toggle { visibility: hidden; }
    .sidebar li.collapsed > ul { display: none; }
    .content{flex-grow:1;padding:2rem 1.5rem;overflow-y:auto;}
    .content h1,.content h2{color:#005a9e;border-bottom:1px solid var(--border-color);padding-bottom:.5rem}
    .result-item{border:1px solid var(--border-color);background-color:white;padding:1rem;margin-bottom:1rem;border-radius:5px}
    .result-item h3{margin-top:0}.result-item a{text-decoration:none;color:var(--primary-color)}
    .result-item p{margin-bottom:0;font-size:.9rem;color:#6c757d}
    .result-item mark {background: #fff3cd; padding: 0; font-weight: bold; color: inherit;}
    .zoom-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:1000;opacity:0;transition:opacity .3s ease;overflow:hidden;}
    .zoom-modal.visible{opacity:1}
    .zoom-modal img{max-width:95%;max-height:95%;object-fit:contain;transition:transform 0.1s linear;border:2px solid white; border-radius: 5px; cursor: zoom-in;}
    .zoom-modal::after{content:'×';position:fixed;top:15px;right:25px;font-size:3rem;color:white;cursor:pointer;font-weight:200;}
    `;
}
