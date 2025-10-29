// รอให้ HTML โหลดเสร็จก่อนเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {
    // ===== ตัวแปรหลักที่ใช้ในสคริปต์ =====
    const mainContent = document.querySelector('.container'); // ส่วนแสดงเนื้อหาหลัก
    const mapContainer = document.querySelector('.map-container'); // ส่วนแสดงการ์ดแนะนำ
    let database = {}; // เก็บข้อมูลทั้งหมดจาก database.json
    let allBuildings = []; // เก็บข้อมูลอาคารทั้งหมด

    /**
     * @async
     * @function initializeApp
     * @description ฟังก์ชันหลัก: โหลดข้อมูลจาก database.json และเริ่มต้นการทำงานของแอปพลิเคชัน
     */
    async function initializeApp() {
        try {
            // ส่ง request ไปยังไฟล์ database.json
            const response = await fetch('database.json');
            // ตรวจสอบว่า request สำเร็จหรือไม่
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // แปลงข้อมูล JSON ที่ได้รับมาเป็น Object
            database = await response.json();
            allBuildings = database.buildings;
            // แสดงการ์ดแนะนำพิเศษ
            displayFeaturedCard(database.featuredBuilding);
            // แสดงหน้าหลักพร้อมข้อมูลอาคารทั้งหมด
            renderMainPage(allBuildings);
        } catch (error) {
            // แสดงข้อผิดพลาดใน console หากโหลดข้อมูลไม่สำเร็จ
            console.error("Could not load database:", error);
            mainContent.innerHTML = '<p style="text-align: center; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        }
    }

    /**
     * @function convertDriveLink
     * @description แปลง URL ของ Google Drive ให้เป็นลิงก์สำหรับแสดงผลรูปภาพโดยตรง (thumbnail)
     * @param {string} url - URL ของ Google Drive ที่ต้องการแปลง
     * @returns {string} - URL ของรูปภาพ thumbnail หรือ URL เดิมถ้าแปลงไม่ได้ หรือ URL รูปภาพสำรองถ้าไม่มี URL มาให้
     */
    function convertDriveLink(url) {
        // ถ้าไม่มี URL หรือ URL ไม่ใช่ string ให้คืนค่าเป็นรูปภาพสำรอง
        if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop';
        
        let fileId = null;
        // ใช้ Regular Expression เพื่อดึง File ID จาก URL รูปแบบที่ 1
        let match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            fileId = match[1];
        } else {
            // ใช้ Regular Expression เพื่อดึง File ID จาก URL รูปแบบที่ 2
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                fileId = match[1];
            }
        }
        
        // ถ้าเจอ File ID ให้สร้างเป็น URL thumbnail ถ้าไม่เจอให้คืน URL เดิม
        return fileId ? `https://drive.google.com/thumbnail?id=${fileId}` : url;
    }

    /**
     * @function createEmbedUrl
     * @description สร้าง URL สำหรับฝัง (embed) Google Maps จาก URL ปกติ
     * @param {string} locationUrl - URL ของ Google Maps
     * @returns {string} - URL สำหรับใช้ใน iframe
     */
    function createEmbedUrl(locationUrl) {
        if (!locationUrl) return ''; // ถ้าไม่มี URL ให้คืนค่าว่าง
        if (locationUrl.includes('embed')) return locationUrl; // ถ้าเป็น URL แบบ embed อยู่แล้ว ให้คืนค่าเดิม
        
        // ดึงค่า query (ชื่อสถานที่หรือพิกัด) จาก URL
        const match = locationUrl.match(/query=([^&]+)/);
        if (match && match[1]) {
            const query = match[1];
            // สร้าง URL สำหรับ embed
            return `https://maps.google.com/maps?q=${query}&hl=th&z=16&output=embed`;
        }
        return ''; // ถ้าไม่สำเร็จ ให้คืนค่าว่าง
    }

    /**
     * @function renderMainPage
     * @description สร้างและแสดงผลหน้าหลัก ซึ่งประกอบด้วยปุ่มกรองและ Grid สำหรับการ์ดอาคาร
     * @param {Array<Object>} buildings - Array ของข้อมูลอาคารที่จะแสดงผล
     */
    function renderMainPage(buildings) {
        // สร้าง HTML ของหน้าหลัก
        mainContent.innerHTML = `
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterBuildings('all')">ทั้งหมด</button>
                <button class="filter-btn" onclick="filterBuildings('academic')">อาคารเรียน</button>
                <button class="filter-btn" onclick="filterBuildings('administration')">อาคารบริหาร</button>
                <button class="filter-btn" onclick="filterBuildings('facility')">สิ่งอำนวยความสะดวก</button>
            </div>
            <div class="buildings-grid" id="buildingsGrid"></div>
        `;
        // เรียกฟังก์ชันเพื่อแสดงการ์ดอาคาร
        displayBuildingCards(buildings);
    }

    /**
     * @function displayFeaturedCard
     * @description สร้างและแสดงผลการ์ดแนะนำพิเศษ (Featured Card) ในส่วนบนของหน้าเว็บ
     * @param {Object} building - Object ข้อมูลของอาคารที่จะแสดงเป็น Featured
     */
    function displayFeaturedCard(building) {
        if (!building || !mapContainer) return; // ออกจากฟังก์ชันถ้าไม่มีข้อมูลหรือ element

        // เตรียมข้อมูล URL ต่างๆ
        const imageUrl = convertDriveLink(building.image);
        const embedUrl = createEmbedUrl(building.location_url);
        const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.location)}`;

        // สร้าง HTML ของการ์ดแนะนำ
        mapContainer.innerHTML = `
            <div class="featured-card">
                <div class="card-content-wrapper">
                    <img src="${imageUrl}" alt="${building.name}" class="card-image">
                    <div class="card-details">
                        <h1>${building.name} (${building.id})</h1>
                        <div class="building-detail">
                            <p class="history-text">${building.history}</p>
                        </div>
                        <p><strong>ที่ตั้ง:</strong> <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">${building.location}</a></p>
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
        // ตั้งค่าปุ่ม "อ่านเพิ่มเติม" สำหรับการ์ดแนะนำ (ใช้ setTimeout เพื่อรอให้ DOM อัปเดต)
        setTimeout(() => setupReadMoreForSelector('.featured-card .history-text'), 100);
    }

    /**
     * @function displayBuildingCards
     * @description สร้างและแสดงผลการ์ดอาคารทั้งหมดลงใน Grid
     * @param {Array<Object>} buildings - Array ของข้อมูลอาคารที่จะแสดงผล
     */
    function displayBuildingCards(buildings) {
        const buildingsGrid = document.getElementById('buildingsGrid');
        buildingsGrid.innerHTML = ''; // เคลียร์ข้อมูลเก่า

        // กรณีไม่พบอาคาร
        if (buildings.length === 0) {
            buildingsGrid.innerHTML = '<p>ไม่พบอาคารในหมวดหมู่นี้</p>';
        } else {
            // วนลูปสร้างการ์ดสำหรับแต่ละอาคาร
            buildings.forEach((building, index) => {
                const imageUrl = convertDriveLink(building.image);
                const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.location)}`;
                const card = document.createElement('div');
                card.className = 'building-card';
                card.dataset.id = building.id; // เก็บ ID ของอาคารไว้ใน data attribute
                card.setAttribute('data-aos', 'fade-up'); // ตั้งค่า Animation
                card.setAttribute('data-aos-delay', index * 50); // ตั้งค่าดีเลย์ของ Animation
                
                // สร้าง HTML ภายในการ์ด
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
                            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">${building.location}</a>
                        </div>
                        <button class="detail-btn">ดูรายละเอียด</button>
                    </div>
                `;
                // เพิ่มการ์ดลงใน Grid
                buildingsGrid.appendChild(card);
            });
            // ตั้งค่าปุ่ม "อ่านเพิ่มเติม" สำหรับทุกการ์ด
            setTimeout(() => setupReadMoreForSelector('.history-text'), 100);
        }
    }

    /**
     * @function setupReadMoreForSelector
     * @description ตรวจสอบ element ที่มีข้อความยาวเกินและเพิ่มปุ่ม "อ่านเพิ่มเติม" / "ซ่อน"
     * @param {string} selector - CSS Selector ของ element ที่ต้องการตรวจสอบ (เช่น '.history-text')
     */
    function setupReadMoreForSelector(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(textElement => {
            const parent = textElement.parentElement;
            // ถ้ามีปุ่มอยู่แล้ว ไม่ต้องทำอะไร
            if (parent.querySelector('.read-more-btn')) {
                return;
            }

            // ตรวจสอบว่าข้อความมีความสูงเกินกว่าพื้นที่ที่แสดงผลหรือไม่
            const isOverflowing = textElement.scrollHeight > textElement.clientHeight;
            
            if (isOverflowing) {
                // สร้างปุ่ม "อ่านเพิ่มเติม"
                const readMoreBtn = document.createElement('button');
                readMoreBtn.innerText = 'อ่านเพิ่มเติม';
                readMoreBtn.className = 'read-more-btn';
                parent.appendChild(readMoreBtn);

                // เพิ่ม Event Listener ให้ปุ่ม
                readMoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // หยุดไม่ให้ event click ลามไปถึง parent (ซึ่งจะทำให้ไปหน้ารายละเอียด)
                    const itemParent = textElement.closest('.vision-mission-item, .building-detail');
                    if (itemParent) {
                        itemParent.classList.toggle('expanded'); // สลับ class 'expanded'
                        // เปลี่ยนข้อความบนปุ่ม
                        readMoreBtn.innerText = itemParent.classList.contains('expanded') ? 'ซ่อน' : 'อ่านเพิ่มเติม';
                    }
                });
            }
        });
    }

    /**
     * @function displayBuildingDetail
     * @description สร้างและแสดงผลหน้ารายละเอียดของอาคารที่เลือก
     * @param {string} buildingId - ID ของอาคารที่ต้องการแสดงรายละเอียด
     */
    function displayBuildingDetail(buildingId) {
        // ค้นหาข้อมูลอาคารและห้องจาก ID
        const building = allBuildings.find(b => b.id === buildingId);
        const rooms = database.rooms.filter(r => r.buildingId === buildingId);
        const imageUrl = convertDriveLink(building.image);
        const embedUrl = createEmbedUrl(building.location_url);

        // ซ่อนส่วนของการ์ดแนะนำ
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }

        // สร้าง HTML ของหน้ารายละเอียด
        mainContent.innerHTML = `
            <div class="detail-view" data-aos="fade-in">
                <button class="back-btn" onclick="goBack()">&larr; กลับไปหน้าหลัก</button>
                <div class="detail-header-card">
                    <div class="detail-header-main">
                        <img src="${imageUrl}" alt="${building.name}" class="detail-image" data-aos="zoom-in">
                        <div class="detail-header-content" data-aos="fade-left" data-aos-delay="200">
                            <h1>${building.name} (${building.id})</h1>
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
                            <p><strong>ที่ตั้ง:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.location)}" target="_blank" rel="noopener noreferrer">${building.location}</a></p>
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

        // แสดงการ์ดห้อง
        displayRoomCards(rooms);
        // เลื่อนหน้าจอไปด้านบนสุด
        window.scrollTo(0, 0);

        // ตั้งค่าปุ่ม "อ่านเพิ่มเติม" สำหรับวิสัยทัศน์และพันธกิจ
        setTimeout(() => {
            setupReadMoreForSelector('.vision-text');
            setupReadMoreForSelector('.mission-text');
        }, 100);
    }

    /**
     * @function displayRoomCards
     * @description สร้างและแสดงผลการ์ดห้อง โดยจัดกลุ่มตามชั้น
     * @param {Array<Object>} rooms - Array ของข้อมูลห้อง
     */
    function displayRoomCards(rooms) {
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';

        // จัดกลุ่มห้องตามชั้น
        const floors = {};
        for (let i = 1; i <= 9; i++) {
            floors[i] = [];
        }
        rooms.forEach(room => {
            if (floors[room.floor]) {
                floors[room.floor].push(room);
            }
        });

        // วนลูปเพื่อสร้างส่วนของแต่ละชั้น
        for (let i = 1; i <= 9; i++) {
            if (floors[i].length > 0) {
                const floorSection = document.createElement('div');
                floorSection.setAttribute('data-aos', 'fade-up');
                floorSection.innerHTML = `<h3>ชั้น ${i}</h3>`;
                const floorGrid = document.createElement('div');
                floorGrid.className = 'floor-grid';

                // วนลูปสร้างการ์ดของแต่ละห้องในชั้นนั้นๆ
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
                
                floorSection.appendChild(floorGrid);
                roomsGrid.appendChild(floorSection);
            }
        }
    }

    /**
     * @function updateDisplayedBuildings
     * @description อัปเดตการแสดงผลการ์ดอาคารตามเงื่อนไขการกรอง (category) และการค้นหา (search term)
     */
    function updateDisplayedBuildings() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const activeButton = document.querySelector('.filter-btn.active');
        const activeCategory = activeButton ? activeButton.getAttribute('onclick').match(/'([^']+)'/)[1] : 'all';

        let buildingsToDisplay = allBuildings;

        // 1. กรองตามหมวดหมู่ (Category)
        if (activeCategory !== 'all') {
            buildingsToDisplay = buildingsToDisplay.filter(building => building.category === activeCategory);
        }

        // 2. กรองตามคำค้นหา (Search Term)
        if (searchTerm) {
            buildingsToDisplay = buildingsToDisplay.filter(building =>
                (building.name && building.name.toLowerCase().includes(searchTerm)) ||
                (building.id && building.id.toLowerCase().includes(searchTerm))
            );
        }

        // แสดงผลการ์ดอาคารที่ผ่านการกรอง
        displayBuildingCards(buildingsToDisplay);
        // Refresh AOS และตั้งค่าปุ่ม "อ่านเพิ่มเติม" ใหม่
        setTimeout(() => {
            AOS.refresh();
            setupReadMoreForSelector('.history-text');
        }, 100);
    }

    /**
     * @function filterBuildings
     * @description ฟังก์ชันสำหรับกรองอาคารตามหมวดหมู่ (ถูกเรียกใช้จาก HTML ผ่าน onclick)
     * @param {string} category - หมวดหมู่ที่ต้องการกรอง ('all', 'academic', 'administration', 'facility')
     */
    window.filterBuildings = function(category) {
        // เอา class 'active' ออกจากปุ่มทั้งหมด
        document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
        // เพิ่ม class 'active' ให้กับปุ่มที่ถูกคลิก
        const newActiveButton = document.querySelector(`.filter-btn[onclick="filterBuildings('${category}')"]`);
        if (newActiveButton) {
            newActiveButton.classList.add('active');
        }
        // อัปเดตการแสดงผล
        updateDisplayedBuildings();
    }

    /**
     * @function goBack
     * @description ฟังก์ชันสำหรับย้อนกลับไปหน้าหลัก (ถูกเรียกใช้จาก HTML ผ่าน onclick)
     */
    window.goBack = function() {
        // แสดงส่วนการ์ดแนะนำอีกครั้ง
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }
        // แสดงหน้าหลักใหม่
        renderMainPage(allBuildings);
        // ล้างค่าในช่องค้นหา
        const searchInput = document.getElementById('searchInput');
        if(searchInput) searchInput.value = '';
        
        // รีเซ็ตปุ่มกรองให้ 'ทั้งหมด' เป็น active
        document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
        const allButton = document.querySelector(`.filter-btn[onclick="filterBuildings('all')"]`);
        if (allButton) {
            allButton.classList.add('active');
        }
    }

    /**
     * @function searchBuildings
     * @description ฟังก์ชันสำหรับค้นหาอาคาร (ถูกเรียกใช้จาก HTML ผ่าน onkeyup)
     */
    window.searchBuildings = function() {
        updateDisplayedBuildings();
    }

    // ===== Event Listener หลักสำหรับจัดการการคลิก =====
    mainContent.addEventListener('click', (e) => {
        // หา element '.building-card' ที่ใกล้ที่สุดกับจุดที่คลิก
        const buildingCard = e.target.closest('.building-card');

        // ถ้าคลิกบนการ์ด และไม่ได้คลิกบนลิงก์ (<a>)
        if (buildingCard && !e.target.closest('a')) {
            const buildingId = buildingCard.dataset.id; // ดึง ID ของอาคาร
            displayBuildingDetail(buildingId); // แสดงหน้ารายละเอียด
            setTimeout(() => AOS.refresh(), 100); // Refresh AOS
        }
    });

    // เริ่มการทำงานของแอปพลิเคชัน
    initializeApp();
});
