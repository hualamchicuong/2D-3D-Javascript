

document.addEventListener("DOMContentLoaded", async function() {
    const dataUrl = "CS Example Data File.json";
    const jsonData = await fetch(dataUrl).then(res => res.json());


    const sections = jsonData.polygonsBySection;
    const sectionSelect = document.getElementById("sectionSelect");

    // Thêm danh sách section vào dropdown
    sections.forEach(section => {
        let option = document.createElement("option");
        option.value = section.sectionName;
        option.textContent = section.sectionName;
        sectionSelect.appendChild(option);
    });

    // Xử lý vẽ khi chọn section
    sectionSelect.addEventListener("change", function() {
        draw2D(this.value);
    });

    function draw2D(sectionName) {
        const svg = d3.select("#viewer2D");
        svg.selectAll("*").remove();
    
        const section = sections.find(s => s.sectionName === sectionName);
        if (!section) return;

        // if (!section.symbol && !section.symbolDescription) return;

        const width = 500, height = 500;
    
        const xExtent = d3.extent(section.polygons.flatMap(p => p.points2D.map(d => d.vertex[0])));
        const yExtent = d3.extent(section.polygons.flatMap(p => p.points2D.map(d => d.vertex[1])));
    
        const xScale = d3.scaleLinear().domain(xExtent).range([50, width - 50]);
        const yScale = d3.scaleLinear().domain(yExtent).range([height - 50, 50]); // Reverse Y axis

        const infoBox = d3.select("#polygonInfo");

  
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5]) // Zoom limit
            .on("zoom", function (event) {
                const transform = event.transform;
                xScale.range([50 * transform.k, width - 50 * transform.k]);
                yScale.range([height - 50 * transform.k, 50 * transform.k]);
                svg.selectAll("polygon").attr("transform", transform);
                updateAxes();
            });
    
        svg.call(zoom);
    
        // Add x and y axis
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);
    
        svg.append("g")
            .attr("transform", "translate(0," + (height - 50) + ")")
            .call(xAxis);
    
        svg.append("g")
            .attr("transform", "translate(50, 0)")
            .call(yAxis);
    
        // Update the horizontal and vertical axis when user pans or zooms
        function updateAxes() {
            svg.selectAll(".x-axis")
                .call(xAxis);
            svg.selectAll(".y-axis")
                .call(yAxis);
        }

        // Choose polygon when user click
        svg.selectAll("polygon")
            .data(section.polygons)
            .enter().append("polygon")
            .attr("points", polygon => polygon.points2D.map(d => [xScale(d.vertex[0]), yScale(d.vertex[1])]).join(" "))
            .attr("fill", polygon => polygon.color)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .on("click", function (event, polygon) {
                // Highlight the chosen polygon
                d3.selectAll("polygon").attr("stroke", "black").attr("stroke-width", 1);
                d3.select(this).attr("stroke", "red").attr("stroke-width", 3); 

                // Show the information of that polygon
                infoBox.html(`
                    <h3>Polygon Info</h3>
                    <p><b>Symbol:</b> ${polygon.symbol ?? "No data"}</p>
                    <p><b>Symbol Description:</b> ${polygon.symbolDescription ?? "No data"}</p>
                `);
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke", "yellow").attr("stroke-width", 1);
            });
    }
    

    function draw3D(sectionName) {
        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("viewer3D").appendChild(renderer.domElement);        

        const section = sections.find(s => s.sectionName === sectionName);
        if (!section) return;
    
    
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(50, 50, 50);
        camera.lookAt(0, 0, 0);
        scene.background = new THREE.Color(0xfffff); 

    
        const light = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(light);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 100);
        scene.add(directionalLight);
    
        sections.forEach(section => {
            section.polygons.forEach(polygon => {

                // if (!polygon.points3D || polygon.points3D.length === 0) {
                //     console.error("Error: Data of 3D polygon is missing!", polygon);
                //     return; // Skip the error poygon
                // }

                if (polygon.color && polygon.color[0] !== '#') {
                    polygon.color = "#" + polygon.color;
                }
    
                const vertices = polygon.points3D.map(point => {
                    if (!point.vertex || point.vertex.length < 3 || 
                        isNaN(point.vertex[0]) || isNaN(point.vertex[1]) || isNaN(point.vertex[2])) {
                        console.error("Erorr: Invalid data!", point);
                        return new THREE.Vector3(0, 0, 0); // Tránh lỗi bằng cách thay bằng giá trị mặc định
                    }

                    return new THREE.Vector3(
                        point.vertex[0] / 100,  
                        -point.vertex[1] / 100, 
                        point.vertex[2] / 100   
                    );
                }).filter(v => v !== undefined); // Lọc ra các giá trị undefined

                if (vertices.length < 3) {
                    console.error("Error: Not enough vertices to make image!", polygon);
                    return;
                }
    
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(vertices.length * 3);
    
                vertices.forEach((v, i) => {
                    positions[i * 3] = v.x;
                    positions[i * 3 + 1] = v.y;
                    positions[i * 3 + 2] = v.z;
                });
    
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                


                if (positions.some(v => isNaN(v))) {
                    console.error("Error: The position contains NaN data!", positions);
                    return;
                }

                const indices = [];
                for (let i = 1; i < vertices.length - 1; i++) {
                    indices.push(0, i, i + 1);
                }
                geometry.setIndex(indices);

                try {
                    geometry.computeBoundingSphere();
                } catch (error) {
                    console.error("Error: Failed to Compute Bounding Sphere !", error, geometry);
                    return;
                }


                const material = new THREE.MeshStandardMaterial({ 
                    color: polygon.color, 
                    side: THREE.DoubleSide,
                    wireframe: false 
                });
    
                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);


            });
        });

    
        // const controls = new OrbitControls(camera, renderer.domElement);
        // controls.enableDamping = true; 
        // controls.update();
    
        function animate() {
            requestAnimationFrame(animate);
            // controls.update();
            renderer.render(scene, camera);
        }
    
        animate();
    }

    async function generateLegend() {
        const dataUrl = "CS Example Data File.json"; // Đổi thành đường dẫn file JSON
        const jsonData = await fetch(dataUrl).then(res => res.json());
    
        const sections = jsonData.polygonsBySection;
        const legendTable = document.querySelector("#legendTable tbody");
    
        let materials = new Map();
    
        // Duyệt qua tất cả polygons để lấy màu sắc và mô tả vật liệu
        sections.forEach(section => {
            section.polygons.forEach(polygon => {
                if (!materials.has(polygon.color)) {
                    materials.set(polygon.color, polygon.symbolDescription ?? "Unknown Material");
                }
            });
        });
    
        // Xóa nội dung cũ trước khi cập nhật mới
        legendTable.innerHTML = "";
    
        // Thêm dữ liệu vào bảng
        materials.forEach((description, color) => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td style="background: #${color}; width: 50px;"></td>
                <td>${description}</td>
            `;
            legendTable.appendChild(row);
        });
    }
    
    // Gọi hàm khi trang load
    generateLegend();
    
    
    draw3D(sections[0].sectionName);

    draw2D(sections[0].sectionName);
});