document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.container');
    const mapContainer = document.querySelector('.map-container');
    let database = {};
    let allBuildings = [];

    /**
     * ฟังก์ชันหลัก: โหลดข้อมูลจาก database.json และเริ่มต้นการทำงาน
     */
    async function initializeApp() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            database = await response.json();
            allBuildings = database.buildings;
            displayFeaturedCard(database.featuredBuilding); // Use the dedicated featured building object
            renderMainPage(allBuildings); // Render the initial view
        } catch (error) {
            console.error("Could not load database:", error);
            mainContent.innerHTML = '<p style="text-align: center; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        }
    }

    /**
     * แปลง URL ของ Google Drive ให้เป็นลิงก์สำหรับแสดงผลโดยตรง
     */
    function convertDriveLink(url) {
        if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop'; // Default image
        
        let fileId = null;
        let match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            fileId = match[1];
        } else {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                fileId = match[1];
            }
        }
        
        return fileId ? `https://drive.google.com/thumbnail?id=${fileId}` : url;
    }

    /**
     * สร้าง URL สำหรับฝัง Google Maps จาก location_url
     */
    function createEmbedUrl(locationUrl) {
        if (!locationUrl) return '';
        if (locationUrl.includes('embed')) return locationUrl;
        
        const match = locationUrl.match(/query=([^&]+)/);
        if (match && match[1]) {
            const query = match[1];
            return `https://maps.google.com/maps?q=${query}&hl=th&z=16&output=embed`;
        }
        return '';
    }

    /**
     * แสดงผลหน้าหลัก (ปุ่มกรอง + การ์ดอาคาร)
     */
    function renderMainPage(buildings) {
        mainContent.innerHTML = `
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterBuildings('all')">ทั้งหมด</button>
                <button class="filter-btn" onclick="filterBuildings('academic')">อาคารเรียน</button>
                <button class="filter-btn" onclick="filterBuildings('administration')">อาคารบริหาร</button>
                <button class="filter-btn" onclick="filterBuildings('facility')">สิ่งอำนวยความสะดวก</button>
            </div>
            <div class="buildings-grid" id="buildingsGrid"></div>
        `;
        displayBuildingCards(buildings); // Display all buildings
    }

    /**
     * แสดงผลการ์ดอาคาร
     */
    /**
     * แสดงการ์ดแนะนำพิเศษแทนที่รูปภาพหลัก
     */
    function displayFeaturedCard(building) {
        if (!building || !mapContainer) return;

        const imageUrl = convertDriveLink(building.image);
        const embedUrl = createEmbedUrl(building.location_url);

        mapContainer.innerHTML = `
            <div class="featured-card">
                <div class="card-content-wrapper">
                    <img src="${imageUrl}" alt="${building.name}" class="card-image">
                    <div class="card-details">
                        <h1>${building.name} (${building.id})</h1>
                        <div class="building-detail">
                            <p class="history-text">${building.history}</p>
                        </div>
                        <p><strong>ที่ตั้ง:</strong> <a href="${building.location_url}" target="_blank" rel="noopener noreferrer">${building.location}</a></p>
                    </div>
                </div>
                ${embedUrl ? `
                <div class="card-map-container">
                    <iframe 
                        src="${embedUrl}" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allowfullscreen="" 
                        loading="lazy" 
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>` : ''}
            </div>
        `;
        // ใช้ setTimeout เพื่อให้แน่ใจว่า DOM อัปเดตแล้วก่อนที่จะเรียกใช้ setupReadMore
        setTimeout(() => setupReadMoreForSelector('.featured-card .history-text'), 100);
    }

    /**
     * แสดงผลการ์ดอาคาร
     */
    function displayBuildingCards(buildings) {
        const buildingsGrid = document.getElementById('buildingsGrid');
        buildingsGrid.innerHTML = '';

        if (buildings.length === 0) {
            buildingsGrid.innerHTML = '<p>ไม่พบอาคารในหมวดหมู่นี้</p>';
        } else {
            buildings.forEach((building, index) => {
                const imageUrl = convertDriveLink(building.image);
                const card = document.createElement('div');
                card.className = 'building-card';
                card.dataset.id = building.id;
                card.setAttribute('data-aos', 'fade-up');
                card.setAttribute('data-aos-delay', index * 50);
                
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${building.name}" class="building-image">
                    <div class="building-header">
                        <div class="building-number">${building.id}</div>
                        <div class="building-name">${building.name}</div>
                    </div>
                    <div class="building-content">
                        <div class="building-detail">
                            <strong>ประวัติ:</strong>
                            <p class="history-text">${building.history}</p>
                        </div>
                        <div class="building-detail">
                            <strong>ที่ตั้ง:</strong>
                            <a href="${building.location_url}" rel="noopener noreferrer">${building.location}</a>
                        </div>
                    </div>
                `;
                buildingsGrid.appendChild(card);
            });
            setTimeout(() => setupReadMoreForSelector('.history-text'), 100); // Delay to allow rendering
        }
    }

    /**
     * จัดการปุ่ม "อ่านเพิ่มเติม" แบบทั่วไปสำหรับ Selector ที่กำหนด
     */
    function setupReadMoreForSelector(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(textElement => {
            const parent = textElement.parentElement;
            if (parent.querySelector('.read-more-btn')) {
                return;
            }

            const isOverflowing = textElement.scrollHeight > textElement.clientHeight;
            
            if (isOverflowing) {
                const readMoreBtn = document.createElement('button');
                readMoreBtn.innerText = 'อ่านเพิ่มเติม';
                readMoreBtn.className = 'read-more-btn';
                parent.appendChild(readMoreBtn);

                readMoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itemParent = textElement.closest('.vision-mission-item, .building-detail');
                    if (itemParent) {
                        itemParent.classList.toggle('expanded');
                        readMoreBtn.innerText = itemParent.classList.contains('expanded') ? 'ซ่อน' : 'อ่านเพิ่มเติม';
                    }
                });
            }
        });
    }

    /**
     * แสดงผลหน้ารายละเอียดอาคารและห้อง
     */
    function displayBuildingDetail(buildingId) {
        const building = allBuildings.find(b => b.id === buildingId);
        const rooms = database.rooms.filter(r => r.buildingId === buildingId);
        const imageUrl = convertDriveLink(building.image);
        const embedUrl = createEmbedUrl(building.location_url);

        if (mapContainer) {
            mapContainer.style.display = 'none';
        }

        mainContent.innerHTML = `
            <div class="detail-view" data-aos="fade-in">
                <button class="back-btn" onclick="goBack()">&larr; กลับไปหน้าหลัก</button>
                <div class="detail-header-card">
                    <div class="detail-header-main">
                        <img src="${imageUrl}" alt="${building.name}" class="detail-image" data-aos="zoom-in">
                        <div class="detail-header-content" data-aos="fade-left" data-aos-delay="200">
                            <h1>${building.name} (${building.id})</h1>
                            <p>${building.history}</p>
                            <div class="vision-mission-section">
                                <div class="vision-mission-item">
                                    <strong>วิสัยทัศน์:</strong>
                                    <p class="vision-text">${building.vision || 'ไม่มีข้อมูล'}</p>
                                </div>
                                <div class="vision-mission-item">
                                    <strong>พันธกิจ:</strong>
                                    <p class="mission-text">${building.mission || 'ไม่มีข้อมูล'}</p>
                                </div>
                            </div>
                            <p><strong>ที่ตั้ง:</strong> <a href="${building.location_url}" target="_blank" rel="noopener noreferrer">${building.location}</a></p>
                        </div>
                    </div>
                    ${embedUrl ? `
                    <div class="detail-map-container">
                        <iframe 
                            src="${embedUrl}" 
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="lazy" 
                            referrerpolicy="no-referrer-when-downgrade">
                        </iframe>
                    </div>` : ''}
                </div>
                
                <h2 data-aos="fade-up" data-aos-delay="300">ห้องภายในอาคาร</h2>
                <div class="rooms-grid" id="roomsGrid" data-aos="fade-up" data-aos-delay="400"></div>
            </div>
        `;

        displayRoomCards(rooms);
        window.scrollTo(0, 0);

        setTimeout(() => {
            setupReadMoreForSelector('.vision-text');
            setupReadMoreForSelector('.mission-text');
        }, 100);
    }

    /**
     * แสดงผลการ์ดห้อง
     */
    function displayRoomCards(rooms) {
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';

        const floors = {};
        for (let i = 1; i <= 9; i++) {
            floors[i] = [];
        }
        rooms.forEach(room => {
            if (floors[room.floor]) {
                floors[room.floor].push(room);
            }
        });

        for (let i = 1; i <= 9; i++) {
            const floorSection = document.createElement('div');
            floorSection.setAttribute('data-aos', 'fade-up');
            floorSection.innerHTML = `<h3>ชั้น ${i}</h3>`;
            const floorGrid = document.createElement('div');
            floorGrid.className = 'floor-grid';

            if (floors[i].length > 0) {
                floors[i].forEach((room, index) => {
                    const roomCard = document.createElement('div');
                    roomCard.className = 'room-card';
                    roomCard.setAttribute('data-aos', 'fade-up');
                    roomCard.setAttribute('data-aos-delay', index * 50);
                    roomCard.innerHTML = `
                        <h4>${room.name} (${room.id})</h4>
                        <p>${room.description}</p>
                    `;
                    floorGrid.appendChild(roomCard);
                });
            } else {
                floorGrid.innerHTML = '<p class="no-room-info">ไม่มีข้อมูลห้องในชั้นนี้</p>';
            }
            
            floorSection.appendChild(floorGrid);
            roomsGrid.appendChild(floorSection);
        }
    }

    /**
     * ฟังก์ชันกรองอาคารตามหมวดหมู่
     */
    window.filterBuildings = function(category) {
        document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
        document.querySelector(`.filter-btn[onclick="filterBuildings('${category}')"]`).classList.add('active');

        if (category === 'all') {
            displayBuildingCards(allBuildings);
        } else {
            const filteredBuildings = allBuildings.filter(building => building.category === category);
            displayBuildingCards(filteredBuildings);
        }
        setTimeout(() => {
            AOS.refresh();
            setupReadMoreForSelector('.history-text');
        }, 100);
    }

    /**
     * ฟังก์ชันย้อนกลับไปหน้าหลัก
     */
    window.goBack = function() {
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }
        renderMainPage(allBuildings);
        document.querySelector(`.filter-btn[onclick="filterBuildings('all')"]`).classList.add('active');
    }

    /**
     * ฟังก์ชันค้นหาอาคารตามชื่อหรือรหัส
     */
    window.searchBuildings = function() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const buildingCards = document.querySelectorAll('.building-card');

        buildingCards.forEach(card => {
            const buildingName = card.querySelector('.building-name').textContent.toLowerCase();
            const buildingNumber = card.querySelector('.building-number').textContent.toLowerCase();

            if (buildingName.includes(searchTerm) || buildingNumber.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // --- Event Listener หลักสำหรับ Container ---
    mainContent.addEventListener('click', (e) => {
        const buildingCard = e.target.closest('.building-card');
        
        if (e.target.tagName === 'A' && e.target.closest('.building-detail')) {
            e.preventDefault();
            
            if (buildingCard) {
                const buildingId = buildingCard.dataset.id;
                const building = allBuildings.find(b => b.id === buildingId);
                
                if (building && building.location_url && mapContainer) {
                    const embedUrl = createEmbedUrl(building.location_url);
                    if (embedUrl) {
                        mapContainer.innerHTML = `
                            <iframe 
                                src="${embedUrl}" 
                                width="100%" 
                                height="100%" 
                                style="border:0;" 
                                allowfullscreen="" 
                                loading="lazy" 
                                referrerpolicy="no-referrer-when-downgrade">
                            </iframe>`;
                        mapContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
            return;
        }

        if (buildingCard) {
            const buildingId = buildingCard.dataset.id;
            displayBuildingDetail(buildingId);
            setTimeout(() => AOS.refresh(), 100);
        }
    });

    initializeApp();
});
