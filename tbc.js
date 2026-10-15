// 时钟逻辑
        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');
        setInterval(() => {
            const now = new Date();
            timeEl.innerText = now.toLocaleTimeString('zh-CN', { hour12: false });
            dateEl.innerText = now.toLocaleDateString('zh-CN').replace(/\//g, '.');
        }, 1000);

        // 数据生成
        const generateTimeData = (count) => {
            let res = [];
            let now = new Date();
            for (let i = 0; i < count; i++) {
                res.unshift(`${now.getHours()}:00`);
                now.setHours(now.getHours() - 1);
            }
            return res;
        };
        const timeCategories = generateTimeData(72);

        const generateSeriesData = (count, target, variance) => {
            return Array.from({length: count}, () => +(target + (Math.random() - 0.5) * variance).toFixed(2));
        };

        const alertsData = [
            { id: 'BX-77-Q9', time: timeCategories[60], eff: 23.8, errorNode: 3, errorName: '硼扩方阻', errorValue: '152Ω/sq', reason: 'Resistance spike detected' },
            { id: 'BX-82-A4', time: timeCategories[45], eff: 23.5, errorNode: 2, errorName: 'LPCVD1膜厚', errorValue: '185nm', reason: 'Thickness overflow' },
            { id: 'CY-11-M2', time: timeCategories[12], eff: 23.9, errorNode: 6, errorName: '磷扩方阻', errorValue: '105Ω/sq', reason: 'Resistance drop detected' }
        ];

        // 图表通用全息风格配置
        const holoOptions = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#00f2fe',
                borderWidth: 1,
                textStyle: { color: '#0f172a', fontFamily: 'monospace' },
                shadowBlur: 10, shadowColor: 'rgba(0, 242, 254, 0.5)'
            },
            xAxis: {
                type: 'category',
                axisLine: { lineStyle: { color: 'rgba(79, 172, 254, 0.5)' } },
                axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: 'rgba(79, 172, 254, 0.15)' } },
                axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' }
            }
        };

        // --- 近3天电池效率趋势 (带发光光波效果) ---
        const effChart = echarts.init(document.getElementById('efficiencyChart'));
        let effData = generateSeriesData(72, 24.8, 0.4);
        alertsData.forEach(alert => {
            let idx = timeCategories.indexOf(alert.time);
            if(idx !== -1) effData[idx] = alert.eff;
        });

        // 将异常点提取为涟漪散点系列
        const scatterData = alertsData.map(a => {
            let idx = timeCategories.indexOf(a.time);
            return idx !== -1 ? [a.time, a.eff] : null;
        }).filter(Boolean);

        effChart.setOption({
            ...holoOptions,
            grid: { top: 20, right: 20, bottom: 20, left: 35 },
            xAxis: { ...holoOptions.xAxis, data: timeCategories },
            yAxis: { ...holoOptions.yAxis, min: 23, max: 26 },
            series: [
                {
                    name: 'Efficiency',
                    data: effData,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { width: 3, color: '#00f2fe', shadowColor: '#00f2fe', shadowBlur: 10 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(0, 242, 254, 0.6)' },
                            { offset: 1, color: 'rgba(0, 242, 254, 0.01)' }
                        ])
                    },
                    markLine: {
                        data: [{ yAxis: 24.2, name: 'Warning', lineStyle: {color: '#ff0844', type: 'dotted'} }],
                        label: { show: false }, symbol: 'none'
                    }
                },
                {
                    name: 'Anomalies',
                    type: 'effectScatter', // 视觉震撼点：红外辐射扫描圈
                    coordinateSystem: 'cartesian2d',
                    data: scatterData,
                    symbolSize: 15,
                    itemStyle: { color: '#ff0844', shadowBlur: 10, shadowColor: '#ff0844' },
                    rippleEffect: { brushType: 'stroke', scale: 4 }
                }
            ]
        });

        // --- LPCVD1 & Boron 小图表 ---
        const lpcvdChart = echarts.init(document.getElementById('lpcvdChart'));
        lpcvdChart.setOption({
            ...holoOptions,
            grid: { top: 10, right: 10, bottom: 20, left: 30 },
            xAxis: { ...holoOptions.xAxis, data: timeCategories.slice(-24), show: false },
            yAxis: { ...holoOptions.yAxis, min: 140, max: 190, splitNumber: 3 },
            series: [{
                data: generateSeriesData(24, 165, 8),
                type: 'line', smooth: true, showSymbol: false,
                lineStyle: { color: '#00f2fe', width: 2, shadowColor: '#00f2fe', shadowBlur: 5 },
                areaStyle: { color: 'rgba(0, 242, 254, 0.1)' }
            }]
        });

        const boronChart = echarts.init(document.getElementById('boronChart'));
        boronChart.setOption({
            ...holoOptions,
            grid: { top: 10, right: 10, bottom: 20, left: 30 },
            xAxis: { ...holoOptions.xAxis, data: timeCategories.slice(-24), show: false },
            yAxis: { ...holoOptions.yAxis, min: 110, max: 150, splitNumber: 3 },
            series: [{
                data: generateSeriesData(24, 130, 6),
                type: 'line', step: 'middle', showSymbol: false,
                lineStyle: { color: '#6366f1', width: 2, shadowColor: '#6366f1', shadowBlur: 5 },
                areaStyle: { color: 'rgba(99, 102, 241, 0.1)' }
            }]
        });

        // Resize 监听
        new ResizeObserver(() => {
            effChart.resize(); lpcvdChart.resize(); boronChart.resize();
            drawHoloNetwork(); // 重绘中心网络连线
        }).observe(document.body);

        // 核心参数：7个节点数据
        const processNodes = [
            { id: 1, name: 'Polishing 1', val: '0.25g', x: 10, y: 30 },
            { id: 2, name: 'LPCVD 1', val: '165nm', x: 30, y: 15 },
            { id: 3, name: 'Boron Diff', val: '130Ω', x: 50, y: 30 },
            { id: 4, name: 'Polishing 2', val: '0.18g', x: 70, y: 15 },
            { id: 5, name: 'LPCVD 2', val: '145nm', x: 90, y: 30 },
            { id: 6, name: 'Phosphorus', val: '85Ω', x: 70, y: 65 },
            { id: 7, name: 'Texturing', val: '0.32g', x: 30, y: 65 }
        ];

        // 连接顺序配置
        const connections = [
            [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]
        ];

        const nodeContainer = document.getElementById('nodeContainer');
        const svgLines = document.getElementById('svgLines');

        function initNodes() {
            nodeContainer.innerHTML = '';
            processNodes.forEach(node => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'absolute transform -translate-x-1/2 -translate-y-1/2 twin-node group';
                nodeDiv.style.left = `${node.x}%`;
                nodeDiv.style.top = `${node.y}%`;
                nodeDiv.id = `node-${node.id}`;

                nodeDiv.innerHTML = `
                    <div class="ring spin-ring-1"></div>
                    <div class="ring-inner spin-ring-2"></div>
                    <div class="core shadow-lg">
                        <span class="text-[10px] font-ds font-bold" id="val-${node.id}">${node.val}</span>
                    </div>
                    <div class="absolute -bottom-8 whitespace-nowrap bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-blue-900 border border-cyan-200/50 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        ${node.name}
                    </div>
                `;
                nodeContainer.appendChild(nodeDiv);
            });
            drawHoloNetwork();
        }

        function drawHoloNetwork() {
            svgLines.innerHTML = '';
            const rect = nodeContainer.getBoundingClientRect();

            connections.forEach((conn, index) => {
                const n1 = processNodes.find(n => n.id === conn[0]);
                const n2 = processNodes.find(n => n.id === conn[1]);

                // 像素坐标系计算
                const x1 = (n1.x / 100) * rect.width;
                const y1 = (n1.y / 100) * rect.height;
                const x2 = (n2.x / 100) * rect.width;
                const y2 = (n2.y / 100) * rect.height;

                // 生成带有曲率的科技感连接线
                let d = `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`;
                if(conn[0] === 5 && conn[1] === 6) {
                     // 5到6折返回来，画个特殊曲线
                     d = `M ${x1} ${y1} C ${x1 + 40} ${y1 + 30}, ${x2 + 40} ${y2 - 30}, ${x2} ${y2}`;
                }

                // 绘制基础路径
                const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathBg.setAttribute('d', d);
                pathBg.setAttribute('class', 'energy-path');
                pathBg.id = `path-bg-${index}`;

                // 绘制流动光效路径
                const pathFlow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathFlow.setAttribute('d', d);
                pathFlow.setAttribute('class', 'energy-flow');
                pathFlow.id = `path-flow-${index}`;

                svgLines.appendChild(pathBg);
                svgLines.appendChild(pathFlow);
            });
        }

        // 初始化
        initNodes();
        window.addEventListener('resize', drawHoloNetwork);

        const alertListEl = document.getElementById('alertList');
        alertsData.forEach((alert, index) => {
            const div = document.createElement('div');
            div.className = "relative p-2 pl-3 bg-white/50 border-l-2 border-red-500 rounded-r shadow-sm hover:bg-white transition-colors cursor-pointer group";
            div.innerHTML = `
                <div class="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <div class="font-ds text-sm font-bold text-red-700">${alert.id}</div>
                        <div class="text-[10px] text-slate-500 font-ds mt-0.5">T: ${alert.time} | EFF: <span class="text-red-600 font-bold">${alert.eff}%</span></div>
                    </div>
                    <button class="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded text-xs hover:bg-red-500 hover:text-white transition-colors">
                        <i class="fa-solid fa-crosshairs"></i>
                    </button>
                </div>
            `;
            div.onclick = () => traceAlert(index);
            alertListEl.appendChild(div);
        });

        let currentActiveAlert = null;

        window.resetProcessMap = function() {
            // 恢复节点
            processNodes.forEach(node => {
                const el = document.getElementById(`node-${node.id}`);
                el.classList.remove('alert-mode');
                document.getElementById(`val-${node.id}`).innerText = node.val;
            });

            // 恢复连线
            connections.forEach((conn, idx) => {
                document.getElementById(`path-bg-${idx}`).classList.remove('alert-path');
                document.getElementById(`path-flow-${idx}`).classList.remove('alert-flow');
            });

            // 恢复文字与状态
            document.getElementById('traceBatch').innerText = "LIVE_AVG_MODE";
            document.getElementById('traceBatch').className = "text-xl font-ds font-bold text-blue-800";

            const dp = document.getElementById('detailPanel');
            dp.classList.replace('border-red-400', 'border-cyan-300/50');
            dp.querySelector('i').className = "fa-solid fa-microchip text-xl text-cyan-600";
            dp.querySelector('i').parentElement.className = 'w-12 h-12 rounded-full border border-cyan-400 flex items-center justify-center bg-cyan-50 text-cyan-600';
            document.getElementById('detailText').innerHTML = "System monitoring nominal. Real-time averages displayed. Click left anomalies for quantum tracing.";

            document.getElementById('resetBtn').classList.add('hidden');
            currentActiveAlert = null;
        };

        window.traceAlert = function(index) {
            resetProcessMap();
            const alert = alertsData[index];
            currentActiveAlert = alert;

            // Header变化
            document.getElementById('traceBatch').innerText = `TGT:${alert.id}`;
            document.getElementById('traceBatch').className = "text-xl font-ds font-bold text-red-600 animate-pulse";

            // 节点闪烁
            const errNodeEl = document.getElementById(`node-${alert.errorNode}`);
            errNodeEl.classList.add('alert-mode');
            document.getElementById(`val-${alert.errorNode}`).innerText = alert.errorValue;

            // 异常连线蔓延效应 (从异常点向后变红)
            let passedError = false;
            connections.forEach((conn, idx) => {
                if(conn[0] === alert.errorNode) passedError = true;
                if(passedError) {
                    document.getElementById(`path-bg-${idx}`).classList.add('alert-path');
                    document.getElementById(`path-flow-${idx}`).classList.add('alert-flow');
                }
            });

            // 底部面板更新
            const dp = document.getElementById('detailPanel');
            dp.classList.replace('border-cyan-300/50', 'border-red-400');
            const iconWrap = dp.querySelector('.fa-microchip').parentElement;
            iconWrap.className = "w-12 h-12 rounded-full border border-red-500 flex items-center justify-center bg-red-50 text-red-600";
            dp.querySelector('i').className = "fa-solid fa-triangle-exclamation text-xl animate-bounce";

            document.getElementById('detailText').innerHTML = `
                <span class="text-red-600 font-bold">CRITICAL DEVIATION DETECTED in batch [${alert.id}]</span><br>
                Node <span class="uppercase font-bold text-red-700">${alert.errorName}</span> reported value <span class="bg-red-100 px-1 rounded">${alert.errorValue}</span>.
                Reason: ${alert.reason}. Yield dropped to ${alert.eff}%.
            `;

            document.getElementById('resetBtn').classList.remove('hidden');
        };

        // 随机数据跳动 (数字孪生的生命力)
        setInterval(() => {
            if(!currentActiveAlert) {
                const lpcvd = (165 + (Math.random() - 0.5) * 2).toFixed(1);
                const boron = (130 + (Math.random() - 0.5) * 2).toFixed(1);
                document.getElementById('lpcvd-val').innerText = lpcvd;
                document.getElementById('boron-val').innerText = boron;

                // 同步更新中心的默认值
                document.getElementById('val-2').innerText = lpcvd + 'nm';
                document.getElementById('val-3').innerText = boron + 'Ω';
            }
        }, 2000);


        document.getElementById('resetBtn').addEventListener('click', window.resetProcessMap);
