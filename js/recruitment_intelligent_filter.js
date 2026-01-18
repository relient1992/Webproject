document.addEventListener('DOMContentLoaded', function() {
            
    // --- 1. FORCE UPPERCASE LOGIC ---
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    });



    // --- 2. INTELLIGENT FILTER DATA (Sample Data - Expand as needed) ---
    const philippineLocations = {
// --- NATIONAL CAPITAL REGION (NCR) ---
"METRO MANILA": {
"MANILA": "1000",
"QUEZON CITY": "1100",
"CALOOCAN CITY (SOUTH)": "1400",
"CALOOCAN CITY (NORTH)": "1420",
"PASAY CITY": "1300",
"MAKATI CITY": "1200",
"MANDALUYONG CITY": "1550",
"MARIKINA CITY": "1800",
"PASIG CITY": "1600",
"PARAÑAQUE CITY": "1700",
"LAS PIÑAS CITY": "1740",
"MUNTINLUPA CITY": "1770",
"TAGUIG CITY": "1630",
"VALENZUELA CITY": "1440",
"MALABON CITY": "1470",
"NAVOTAS CITY": "1485",
"SAN JUAN CITY": "1500",
"PATEROS": "1620"
},

// --- CORDILLERA ADMINISTRATIVE REGION (CAR) ---
"ABRA": { "BANGUED": "2800", "BUCAY": "2805" },
"APAYAO": { "KABUGAO": "3809", "LUNA": "3813" },
"BENGUET": { "BAGUIO CITY": "2600", "LA TRINIDAD": "2601", "TUBA": "2603", "ITOGON": "2604" },
"IFUGAO": { "LAGAWE": "3600", "BANAUE": "3601" },
"KALINGA": { "TABUK CITY": "3800" },
"MOUNTAIN PROVINCE": { "BONTOC": "2616", "SAGADA": "2619" },

// --- REGION I (ILOCOS REGION) ---
"ILOCOS NORTE": { "LAOAG CITY": "2900", "BATAC CITY": "2906", "SAN NICOLAS": "2901", "PAGUDPUD": "2919" },
"ILOCOS SUR": { "VIGAN CITY": "2700", "CANDON CITY": "2710", "NARVACAN": "2704" },
"LA UNION": { "SAN FERNANDO CITY": "2500", "BAUANG": "2501", "AGOO": "2504" },
"PANGASINAN": { "DAGUPAN CITY": "2400", "LINGAYEN": "2401", "URDANETA CITY": "2428", "ALAMINOS CITY": "2404", "SAN CARLOS CITY": "2420" },

// --- REGION II (CAGAYAN VALLEY) ---
"BATANES": { "BASCO": "3900" },
"CAGAYAN": { "TUGUEGARAO CITY": "3500", "APARRI": "3515" },
"ISABELA": { "ILAGAN CITY": "3300", "SANTIAGO CITY": "3311", "CAUAYAN CITY": "3305" },
"NUEVA VIZCAYA": { "BAYOMBONG": "3700", "SOLANO": "3709" },
"QUIRINO": { "CABARROGUIS": "3400" },

// --- REGION III (CENTRAL LUZON) ---
"AURORA": { "BALER": "3200" },
"BATAAN": {
"BALANGA CITY": "2100",
"PILAR": "2101",
"ORION": "2102",
"LIMAY": "2103",
"MARIVELES": "2105",
"BAGAC": "2107",
"MORONG": "2108",
"DINALUPIHAN": "2110",
"HERMOSA": "2111",
"ORANI": "2112",
"SAMAL": "2113",
"ABUCAY": "2114"
},
"BULACAN": {
"MALOLOS CITY": "3000",
"HAGONOY": "3002",
"CALUMPIT": "3003",
"PLARIDEL": "3004",
"PULILAN": "3005",
"BALIUAG": "3006",
"SAN RAFAEL": "3008",
"DOÑA REMEDIOS TRINIDAD": "3009",
"SAN ILDEFONSO": "3010",
"SAN MIGUEL": "3011",
"NORZAGARAY": "3013",
"ANGAT": "3012",
"SANTA MARIA": "3022",
"SAN JOSE DEL MONTE CITY": "3023",
"MARILAO": "3019",
"MEYCAUAYAN CITY": "3020",
"OBANDO": "3021",
"PAOMBONG": "3001",
"BUSTOS": "3007",
"PANDI": "3014",
"GUIGUINTO": "3015",
"BALAGTAS": "3016",
"BOCAUE": "3018",
"BULAKAN": "3017"
},
"NUEVA ECIJA": {
"CABANATUAN CITY": "3100",
"ALIAGA": "3111",
"BONGABON": "3128",
"CABIAO": "3107",
"CARRANGLAN": "3123",
"CUYAPO": "3118",
"GABALDON": "3131",
"GAPAN CITY": "3105",
"GENERAL MAMERTO NATIVIDAD": "3125",
"GENERAL TINIO": "3104",
"GUIMBA": "3115",
"JAEN": "3109",
"LAUR": "3129",
"LICAB": "3112",
"LLANERA": "3126",
"LUPAO": "3122",
"SCIENCE CITY OF MUÑOZ": "3119",
"NAMPICUAN": "3117",
"PALAYAN CITY": "3132",
"PANTABANGAN": "3124",
"PEÑARANDA": "3103",
"QUEZON": "3113",
"RIZAL": "3127",
"SAN ANTONIO": "3108",
"SAN ISIDRO": "3106",
"SAN JOSE CITY": "3121",
"SAN LEONARDO": "3102",
"SANTA ROSA": "3101",
"SANTO DOMINGO": "3133",
"TALAVERA": "3114",
"TALUGTUG": "3116",
"ZARAGOZA": "3110"
},
"PAMPANGA": {
"SAN FERNANDO CITY": "2000",
"ANGELES CITY": "2009",
"MABALACAT CITY": "2010",
"CLARK FREEPORT ZONE": "2023",
"LUBAO": "2005",
"GUAGUA": "2003",
"FLORIDABLANCA": "2006",
"PORAC": "2008",
"MAGALANG": "2011",
"ARAYAT": "2012",
"MEXICO": "2021",
"SANTA ANA": "2022",
"CANDABA": "2013",
"SAN LUIS": "2014",
"SAN SIMON": "2015",
"APALIT": "2016",
"MACABEBE": "2018",
"MASANTOL": "2017",
"MINALINALIN": "2019",
"STO. TOMAS": "2020",
"BACOLOR": "2001",
"SANTA RITA": "2002",
"SASMUAN": "2004"
},
"TARLAC": {
"TARLAC CITY": "2300",
"GERONA": "2302",
"PURA": "2312",
"PANIQUI": "2307",
"MONCADA": "2308",
"SAN MANUEL": "2309",
"ANAO": "2310",
"RAMOS": "2311",
"SAN CLEMENTE": "2305",
"CAMILING": "2306",
"MAYANTOC": "2304",
"SANTA IGNACIA": "2303",
"SAN JOSE": "2318",
"CAPAS": "2315",
"BAMBAN": "2317",
"CONCEPCION": "2316",
"VICTORIA": "2313",
"LA PAZ": "2314"
},
"ZAMBALES": {
"OLONGAPO CITY": "2200",
"IBA": "2201",
"BOTOLAN": "2202",
"CABANGAN": "2203",
"SAN FELIPE": "2204",
"SAN NARCISO": "2205",
"SAN ANTONIO": "2206",
"SAN MARCELINO": "2207",
"CASTILLEJOS": "2208",
"SUBIC": "2209",
"PALAUIG": "2210",
"MASINLOC": "2211",
"CANDELARIA": "2212",
"SANTA CRUZ": "2213"
},

// --- REGION IV-A (CALABARZON) ---
"BATANGAS": { "BATANGAS CITY": "4200", "LIPA CITY": "4217", "TANAUAN CITY": "4232", "STO. TOMAS": "4234", "NASUGBU": "4231" },
"CAVITE": { "TRECE MARTIRES CITY": "4109", "IMUS CITY": "4103", "DASMARIÑAS CITY": "4114", "BACOOR CITY": "4102", "TAGAYTAY CITY": "4120", "CAVITE CITY": "4100", "GENERAL TRIAS": "4107" },
"LAGUNA": { "SANTA ROSA CITY": "4026", "CALAMBA CITY": "4027", "BIÑAN CITY": "4024", "SAN PEDRO CITY": "4023", "SAN PABLO CITY": "4000", "SANTA CRUZ": "4009" },
"QUEZON": { "LUCENA CITY": "4301", "TAYABAS CITY": "4327", "CANDELARIA": "4323", "SARIAYA": "4322" },
"RIZAL": { "ANTIPOLO CITY": "1870", "CAINTA": "1900", "TAYTAY": "1920", "BINANGONAN": "1940", "SAN MATEO": "1850", "RODRIGUEZ (MONTALBAN)": "1860" },

// --- REGION IV-B (MIMAROPA) ---
"MARINDUQUE": { "BOAC": "4900" },
"OCCIDENTAL MINDORO": { "MAMBURAO": "5106", "SAN JOSE": "5100" },
"ORIENTAL MINDORO": { "CALAPAN CITY": "5200", "PUERTO GALERA": "5203" },
"PALAWAN": { "PUERTO PRINCESA CITY": "5300", "EL NIDO": "5313", "CORON": "5316" },
"ROMBLON": { "ROMBLON": "5500", "ODIONGAN": "5505" },

// --- REGION V (BICOL REGION) ---
"ALBAY": { "LEGAZPI CITY": "4500", "TABACO CITY": "4511", "DARAGA": "4501" },
"CAMARINES NORTE": { "DAET": "4600" },
"CAMARINES SUR": { "NAGA CITY": "4400", "PILI": "4418", "IRIGA CITY": "4431" },
"CATANDUANES": { "VIRAC": "4800" },
"MASBATE": { "MASBATE CITY": "5400" },
"SORSOGON": { "SORSOGON CITY": "4700", "MATNOG": "4708" },

// --- REGION VI (WESTERN VISAYAS) ---
"AKLAN": { "KALIBO": "5600", "MALAY (BORACAY)": "5608" },
"ANTIQUE": { "SAN JOSE DE BUENAVISTA": "5700" },
"CAPIZ": { "ROXAS CITY": "5800" },
"GUIMARAS": { "JORDAN": "5045" },
"ILOILO": { "ILOILO CITY": "5000", "OTON": "5020", "PASSI CITY": "5037" },
"NEGROS OCCIDENTAL": { "BACOLOD CITY": "6100", "TALISAY CITY": "6115", "SILAY CITY": "6116", "KABANKALAN CITY": "6111" },

// --- REGION VII (CENTRAL VISAYAS) ---
"BOHOL": { "TAGBILARAN CITY": "6300", "PANGLAO": "6340" },
"CEBU": { "CEBU CITY": "6000", "MANDAUE CITY": "6014", "LAPU-LAPU CITY": "6015", "TALISAY CITY": "6045", "TOLEDO CITY": "6038", "DANAO CITY": "6004" },
"NEGROS ORIENTAL": { "DUMAGUETE CITY": "6200", "BAIS CITY": "6206" },
"SIQUIJOR": { "SIQUIJOR": "6225" },

// --- REGION VIII (EASTERN VISAYAS) ---
"BILIRAN": { "NAVAL": "6543" },
"EASTERN SAMAR": { "BORONGAN CITY": "6800" },
"LEYTE": { "TACLOBAN CITY": "6500", "ORMOC CITY": "6541", "PALO": "6501" },
"NORTHERN SAMAR": { "CATARMAN": "6400" },
"SAMAR (WESTERN)": { "CATBALOGAN CITY": "6700", "CALBAYOG CITY": "6710" },
"SOUTHERN LEYTE": { "MAASIN CITY": "6600" },

// --- REGION IX (ZAMBOANGA PENINSULA) ---
"ZAMBOANGA DEL NORTE": { "DIPOLOG CITY": "7100", "DAPITAN CITY": "7101" },
"ZAMBOANGA DEL SUR": { "PAGADIAN CITY": "7016", "ZAMBOANGA CITY": "7000" },
"ZAMBOANGA SIBUGAY": { "IPIL": "7001" },

// --- REGION X (NORTHERN MINDANAO) ---
"BUKIDNON": { "MALAYBALAY CITY": "8700", "VALENCIA CITY": "8709" },
"CAMIGUIN": { "MAMBAJAO": "9100" },
"LANAO DEL NORTE": { "ILIGAN CITY": "9200", "TUBOD": "9209" },
"MISAMIS OCCIDENTAL": { "OROQUIETA CITY": "7207", "OZAMIZ CITY": "7200" },
"MISAMIS ORIENTAL": { "CAGAYAN DE ORO CITY": "9000", "GINGOOG CITY": "9014" },

// --- REGION XI (DAVAO REGION) ---
"DAVAO DE ORO": { "NABUNTURAN": "8800" },
"DAVAO DEL NORTE": { "TAGUM CITY": "8100", "PANABO CITY": "8105", "ISLAND GARDEN CITY OF SAMAL": "8119" },
"DAVAO DEL SUR": { "DAVAO CITY": "8000", "DIGOS CITY": "8002" },
"DAVAO OCCIDENTAL": { "MALITA": "8012" },
"DAVAO ORIENTAL": { "MATI CITY": "8200" },

// --- REGION XII (SOCCSKSARGEN) ---
"COTABATO (NORTH)": { "KIDAPAWAN CITY": "9400", "MIDSAYAP": "9410" },
"SARANGANI": { "ALABEL": "9501" },
"SOUTH COTABATO": { "KORONADAL CITY": "9506", "GENERAL SANTOS CITY": "9500", "POLOMOLOK": "9504" },
"SULTAN KUDARAT": { "ISULAN": "9805", "TACURONG CITY": "9800" },

// --- REGION XIII (CARAGA) ---
"AGUSAN DEL NORTE": { "BUTUAN CITY": "8600", "CABADBARAN CITY": "8605" },
"AGUSAN DEL SUR": { "PROSPERIDAD": "8500", "BAYUGAN CITY": "8502" },
"DINAGAT ISLANDS": { "SAN JOSE": "8427" },
"SURIGAO DEL NORTE": { "SURIGAO CITY": "8400" },
"SURIGAO DEL SUR": { "TANDAG CITY": "8300", "BISLIG CITY": "8311" },

// --- BARMM ---
"BASILAN": { "ISABELA CITY": "7300", "LAMITAN CITY": "7302" },
"LANAO DEL SUR": { "MARAWI CITY": "9700" },
"MAGUINDANAO": { "COTABATO CITY": "9600", "SHARIFF AGUAK": "9608" },
"SULU": { "JOLO": "7400" },
"TAWI-TAWI": { "BONGAO": "7500" }
};

    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const zipInput = document.getElementById('zipcode');

    // --- 3. POPULATE PROVINCES ---
    // Sort provinces alphabetically
    const sortedProvinces = Object.keys(philippineLocations).sort();
    sortedProvinces.forEach(prov => {
        const option = document.createElement('option');
        option.value = prov;
        option.textContent = prov;
        provinceSelect.appendChild(option);
    });

    // --- 4. HANDLE PROVINCE CHANGE ---
    provinceSelect.addEventListener('change', function() {
        const selectedProvince = this.value;
        
        // Reset City & Zip
        citySelect.innerHTML = '<option value="" disabled selected>SELECT CITY/MUNICIPALITY...</option>';
        zipInput.value = "";
        
        if (selectedProvince && philippineLocations[selectedProvince]) {
            // Enable City Dropdown
            citySelect.disabled = false;
            
            // Populate Cities
            const cities = Object.keys(philippineLocations[selectedProvince]).sort();
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        } else {
            citySelect.disabled = true;
        }
    });

    // --- 5. HANDLE CITY CHANGE (AUTO-ZIP) ---
    citySelect.addEventListener('change', function() {
        const selectedProvince = provinceSelect.value;
        const selectedCity = this.value;

        if (selectedProvince && selectedCity) {
            const zip = philippineLocations[selectedProvince][selectedCity];
            zipInput.value = zip || "";
        }
    });


    const skillDropdown = document.getElementById('skill_dropdown');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const selectedSkillsContainer = document.getElementById('selectedSkillsContainer');
    const hiddenSkillInput = document.getElementById('hidden_specific_skill');
    
    // Global array to store selected skills
    let selectedSkills = []; 

    // --- FETCH SKILLS FROM DATABASE ---
    async function loadSkillsFromDB() {
        try {
            const response = await fetch('../hr_dashboard_api.php?action=getSkills');
            if (!response.ok) throw new Error('Failed to load skills');
            
            // SAVE GLOBALLY so the scoring function can access categories later
            window.allSkillsData = await response.json(); 
            
            populateSkillDropdown(window.allSkillsData);
        } catch (error) {
            console.error('Error loading skills:', error);
            if(skillDropdown) skillDropdown.innerHTML = '<option value="">Error loading skills</option>';
        }
    }

    // --- POPULATE DROPDOWN ---
    function populateSkillDropdown(skills) {
        if(!skillDropdown) return;

        skillDropdown.innerHTML = '<option value="">Search or select a skill...</option>';
        
        skills.forEach(skill => {
            const skillName = skill.name || skill; 
            const option = document.createElement('option');
            option.value = skillName;
            option.textContent = skillName;
            skillDropdown.appendChild(option);
        });
    }

    // --- ADD SKILL LOGIC ---
    function addSkill() {
        if(!skillDropdown) return;
        
        const skill = skillDropdown.value;
        if (skill && !selectedSkills.includes(skill)) {
            selectedSkills.push(skill);
            renderSkills();
            updateHiddenInput();
            skillDropdown.value = ''; // Reset dropdown
        }
    }

    // --- RENDER TAGS ---
    function renderSkills() {
        if(!selectedSkillsContainer) return;

        selectedSkillsContainer.innerHTML = '';
        selectedSkills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag'; // Uses your CSS class
            tag.innerHTML = `
                ${skill}
                <i class="fas fa-times remove-skill" onclick="removeSkill('${skill}')"></i>
            `;
            selectedSkillsContainer.appendChild(tag);
        });
    }

    // --- REMOVE SKILL LOGIC (Global Scope) ---
    window.removeSkill = function(skill) { 
        selectedSkills = selectedSkills.filter(s => s !== skill);
        renderSkills();
        updateHiddenInput();
    };

    // --- UPDATE HIDDEN INPUT ---
    function updateHiddenInput() {
        if(hiddenSkillInput) {
            hiddenSkillInput.value = selectedSkills.join(', '); 
        }
        
        // Trigger scoring update if the function exists (for the recruitment form)
        if (typeof calculatePrescreening === 'function') {
            calculatePrescreening(); 
        }
    }

    // --- EVENT LISTENERS ---
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent form submit
            addSkill();
        });
    }
    
    // Initialize Skills
    loadSkillsFromDB();

});