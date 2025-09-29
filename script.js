// --- KHAI BÁO BIẾN TOÀN CỤC ---
const transactionTableBody = document.getElementById('transactionTable').getElementsByTagName('tbody')[0];
const loadMoreBtn = document.getElementById('loadMoreBtn');
const statusMessage = document.getElementById('statusMessage');
const pnlChartCanvas = document.getElementById('pnlChart');
const TRANSACTIONS_PER_PAGE = 10;
let transactions = [];
let currentPage = 1;
let pnlChartInstance = null; // Biến lưu instance của Chart.js

// --- CHỨC NĂNG KHỞI TẠO VÀ TẢI DỮ LIỆU ---

document.addEventListener('DOMContentLoaded', () => {
    loadAllTransactions();
    // Đặt năm hiện tại làm giá trị mặc định cho ô input năm xuất Excel
    document.getElementById('exportYear').value = new Date().getFullYear();
    // Đặt ngày hôm nay làm mặc định cho input ngày
    document.getElementById('date').value = moment().format('YYYY-MM-DD');
});

// Tải tất cả giao dịch từ LocalStorage
function loadAllTransactions() {
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    // Sắp xếp theo ngày (mới nhất lên đầu để phân trang)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    currentPage = 1;
    displayTransactions();
    updateSummary();
    drawChart();
}

// Hiển thị giao dịch (áp dụng logic phân trang)
function displayTransactions() {
    transactionTableBody.innerHTML = '';
    const startIndex = 0;
    const endIndex = currentPage * TRANSACTIONS_PER_PAGE;
    
    const transactionsToDisplay = transactions.slice(startIndex, endIndex);

    transactionsToDisplay.forEach((transaction, index) => {
        // Index trong mảng hiện tại đang hiển thị
        appendTransactionToTable(transaction, transactions.indexOf(transaction)); 
    });

    // Cập nhật nút "Xem thêm"
    if (endIndex < transactions.length) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Tải thêm 10 giao dịch
function loadMoreTransactions() {
    currentPage++;
    displayTransactions();
}

// --- LOGIC TÍNH TOÁN CƠ BẢN ---

// Hàm tính toán PNL và % từ Vốn và Số dư
function calculateProfitLossFromValues(initialCapital, finalBalance) {
    initialCapital = parseFloat(initialCapital) || 0;
    finalBalance = parseFloat(finalBalance) || 0;

    const profitLoss = finalBalance - initialCapital;
    // PNL% dựa trên Vốn ban đầu trong ngày
    const profitPercentage = (initialCapital !== 0) ? (profitLoss / initialCapital) * 100 : 0;
    return {
        profitLoss: profitLoss.toFixed(2),
        profitPercentage: profitPercentage.toFixed(2)
    };
}

// Tự động tính toán khi nhập Số dư cuối
function calculateProfitLoss() {
    const initialCapitalInput = document.getElementById('initialCapital');
    const finalBalanceInput = document.getElementById('finalBalance');
    let initialCapital = parseFloat(initialCapitalInput.value);
    const finalBalance = parseFloat(finalBalanceInput.value);

    // Tự động điền vốn ban đầu nếu trống và có giao dịch trước đó (logic giữ nguyên)
    if (transactions.length > 0 && !initialCapitalInput.value && finalBalanceInput === document.activeElement) {
        // Lấy giao dịch mới nhất (vì mảng đã được sắp xếp theo ngày giảm dần)
        const lastTransaction = transactions[0]; 
        initialCapitalInput.value = lastTransaction.finalBalance.toFixed(2);
        initialCapital = parseFloat(initialCapitalInput.value);
    }
    
    if (!isNaN(initialCapital) && !isNaN(finalBalance)) {
        // Có thể hiển thị PNL và % ra một ô/thông báo nào đó nếu muốn
        return calculateProfitLossFromValues(initialCapital, finalBalance);
    } 
    return null;
}

// --- LOGIC THÊM, SỬA, XÓA DỮ LIỆU ---

// Tạo ID duy nhất (sử dụng Web Crypto API nếu có, hoặc fallback)
function createUniqueId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    // Fallback: simple timestamp + random number
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function addTransaction() {
    const date = document.getElementById('date').value;
    const initialCapitalInput = document.getElementById('initialCapital');
    const finalBalance = parseFloat(document.getElementById('finalBalance').value);
    
    // Auto-fill Vốn ban đầu nếu trống
    if (!initialCapitalInput.value && transactions.length > 0) {
        initialCapitalInput.value = transactions[0].finalBalance.toFixed(2);
    }
    const initialCapital = parseFloat(initialCapitalInput.value);

    if (date && !isNaN(initialCapital) && initialCapital >= 0 && !isNaN(finalBalance)) {
        const { profitLoss, profitPercentage } = calculateProfitLossFromValues(initialCapital, finalBalance);

        const newTransaction = {
            id: createUniqueId(), // THÊM ID DUY NHẤT
            date,
            initialCapital,
            finalBalance,
            profitLoss: parseFloat(profitLoss),
            profitPercentage: parseFloat(profitPercentage)
        };
        
        transactions.push(newTransaction);
        
        // Sắp xếp lại và lưu
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sắp xếp theo ngày giảm dần (mới nhất lên đầu)
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        clearForm();
        loadAllTransactions(); // Tải lại để áp dụng phân trang và cập nhật UI
        showStatusMessage('Thêm giao dịch thành công!', 'success');
    } else {
        showStatusMessage('Vui lòng nhập đầy đủ thông tin hợp lệ (Ngày, Vốn ban đầu >= 0, Số dư cuối).', 'error');
    }
}

function confirmDeleteTransaction(id) {
    if (confirm("Bạn có chắc chắn muốn xoá giao dịch này?")) {
        deleteTransaction(id);
    }
}

function deleteTransaction(id) {
    const initialLength = transactions.length;
    transactions = transactions.filter(t => t.id !== id);
    
    if (transactions.length < initialLength) {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        loadAllTransactions();
        showStatusMessage('Đã xoá giao dịch.', 'success');
    }
}

// Sửa dữ liệu trực tiếp trên bảng
function updateTransactionData(id, field, value) {
    const editedValue = parseFloat(value);
    const transactionIndex = transactions.findIndex(t => t.id === id);

    if (transactionIndex === -1) return; // Không tìm thấy ID

    // Kiểm tra tính hợp lệ
     if (isNaN(editedValue) || (field === 'initialCapital' && editedValue < 0)) {
         showStatusMessage('Vui lòng nhập một giá trị số hợp lệ (Vốn ban đầu không được âm).', 'error');
         // Tải lại để khôi phục giá trị cũ
         // Không cần loadAllTransactions() vì sẽ gây nháy bảng
         // Thay vào đó, tìm và cập nhật lại ô vừa sửa
         const rowElement = document.querySelector(`tr[data-id="${id}"]`);
         if(rowElement){
             // Lấy giá trị cũ từ đối tượng transactions
             const oldValue = transactions[transactionIndex][field].toFixed(2);
             // Tìm ô (cell) và cập nhật lại nội dung
             const cellIndex = (field === 'initialCapital') ? 1 : 4; 
             rowElement.cells[cellIndex].textContent = oldValue;
         }
         return;
     }

    // Cập nhật giá trị
    transactions[transactionIndex][field] = editedValue;
    
    // Tính toán lại PNL và %
    const { profitLoss, profitPercentage } = calculateProfitLossFromValues(
         transactions[transactionIndex].initialCapital,
         transactions[transactionIndex].finalBalance
     );
    transactions[transactionIndex].profitLoss = parseFloat(profitLoss);
    transactions[transactionIndex].profitPercentage = parseFloat(profitPercentage);
    
    // Lưu và tải lại UI
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Tối ưu: Chỉ cần cập nhật lại UI (summary và bảng)
    loadAllTransactions(); // Tải lại để UI đồng bộ (bao gồm cả màu Vốn/Rút)
    showStatusMessage('Cập nhật giao dịch thành công.', 'success');
}

// --- LOGIC HIỂN THỊ VÀ HỖ TRỢ UI ---

function clearForm() {
    document.getElementById('date').value = moment().format('YYYY-MM-DD'); // Đặt lại ngày hôm nay
    document.getElementById('initialCapital').value = '';
    document.getElementById('finalBalance').value = '';
}

function resetData() {
    if (confirm("Bạn có muốn xoá toàn bộ dữ liệu? Hành động này không thể hoàn tác!")) {
        localStorage.removeItem('transactions');
        loadAllTransactions();
        showStatusMessage('Đã xoá toàn bộ dữ liệu giao dịch!', 'success');
    }
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'card'; // Reset class
    statusMessage.classList.add(type);
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3500);
}

function appendTransactionToTable(transaction, originalIndexInSortedArray) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', transaction.id); // Dùng ID thay vì Index

    const profitClass = transaction.profitLoss >= 0 ? 'positive' : 'negative';
    let capitalChangeClass = '';
    
    // Tìm giao dịch trước đó trong MẢNG ĐÃ SẮP XẾP (dùng originalIndexInSortedArray)
    if (originalIndexInSortedArray < transactions.length - 1) { 
        const previousTransaction = transactions[originalIndexInSortedArray + 1];
        const previousBalance = previousTransaction ? previousTransaction.finalBalance : 0;
        const currentInitialCapital = transaction.initialCapital;
        const difference = currentInitialCapital - previousBalance;

        if (difference > 0.01) {
            capitalChangeClass = 'capital-deposit'; // Nạp tiền
        } else if (difference < -0.01) {
            capitalChangeClass = 'capital-withdrawal'; // Rút tiền
        }
    }

    row.innerHTML = `
        <td>${transaction.date}</td>
        <td contenteditable="true" onblur="updateTransactionData('${transaction.id}', 'initialCapital', this.textContent)"
            class="${capitalChangeClass}">${transaction.initialCapital.toFixed(2)}</td>
        <td class="${profitClass}">${transaction.profitLoss.toFixed(2)}</td>
        <td class="${profitClass}">${transaction.profitPercentage.toFixed(2)}%</td>
        <td contenteditable="true" onblur="updateTransactionData('${transaction.id}', 'finalBalance', this.textContent)">${transaction.finalBalance.toFixed(2)}</td>
        <td><button class="delete-btn" onclick="confirmDeleteTransaction('${transaction.id}')"><i class="fas fa-trash"></i></button></td>
    `;

    transactionTableBody.appendChild(row);
}

// --- LOGIC TÓM TẮT VÀ THỐNG KÊ CHUYÊN NGHIỆP ---

function calculateAdvancedStats() {
    if (transactions.length === 0) {
        return { totalDays: 0, finalBalance: 0, totalProfitLoss: 0, totalDeposits: 0, totalWithdrawals: 0, winCount: 0, lossCount: 0, maxWinStreak: 0, maxLossStreak: 0, avgProfitLoss: 0 };
    }

    const uniqueDates = new Set();
    let totalProfitLoss = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let winCount = 0;
    let lossCount = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    // Phải xử lý mảng đã được sắp xếp theo NGÀY GIẢM DẦN (mới nhất lên đầu)
    const sortedByDateAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); 
    let previousBalance = 0;
    
    // TÍNH TOÁN TIỀN NẠP/RÚT VÀ CHUỖI THẮNG THUA
    sortedByDateAsc.forEach((transaction, index) => {
        const currentInitialCapital = transaction.initialCapital;
        const currentFinalBalance = transaction.finalBalance;
        const currentProfitLoss = transaction.profitLoss;

        uniqueDates.add(transaction.date);
        totalProfitLoss += currentProfitLoss;

        // Tính Nạp/Rút
        if (index === 0) {
             // Vốn ban đầu của ngày đầu tiên coi như nạp tiền
             totalDeposits = currentInitialCapital; 
        } else {
             const capitalDifference = currentInitialCapital - previousBalance;
             if (capitalDifference > 0.01) { // Nạp thêm
                 totalDeposits += capitalDifference;
             } else if (capitalDifference < -0.01) { // Rút ra
                 totalWithdrawals += Math.abs(capitalDifference);
             }
        }
        previousBalance = currentFinalBalance;

        // Tính Chuỗi Thắng/Thua
        if (currentProfitLoss > 0.01) {
            winCount++;
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        } else if (currentProfitLoss < -0.01) {
            lossCount++;
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        } else {
            currentWinStreak = 0;
            currentLossStreak = 0;
        }
    });

    const totalTradingDays = winCount + lossCount;
    const avgProfitLoss = totalTradingDays > 0 ? totalProfitLoss / totalTradingDays : 0;

    return {
        totalDays: uniqueDates.size,
        finalBalance: sortedByDateAsc[sortedByDateAsc.length - 1].finalBalance, // Lấy số dư cuối của giao dịch mới nhất
        totalProfitLoss,
        totalDeposits,
        totalWithdrawals,
        winCount,
        lossCount,
        totalTradingDays,
        maxWinStreak,
        maxLossStreak,
        avgProfitLoss
    };
}


function updateSummary() {
    const stats = calculateAdvancedStats();
    
    // Tổng PNL (lãi ròng) dựa trên Tổng nạp và Số dư cuối
    const totalProfitLossPercentage = (stats.totalDeposits > 0) ? ((stats.finalBalance - stats.totalDeposits + stats.totalWithdrawals) / stats.totalDeposits) * 100 : 0;
    const finalProfitLoss = stats.finalBalance - stats.totalDeposits + stats.totalWithdrawals;

    const winRatio = stats.totalTradingDays > 0 ? (stats.winCount / stats.totalTradingDays) * 100 : 0;
    const lossRatio = stats.totalTradingDays > 0 ? (stats.lossCount / stats.totalTradingDays) * 100 : 0;

    document.getElementById('totalDays').textContent = stats.totalDays;
    document.getElementById('totalProfitLoss').textContent = `${finalProfitLoss.toFixed(2)} $`;
    document.getElementById('finalBalanceSummary').textContent = `${stats.finalBalance.toFixed(2)} $`;
    document.getElementById('totalDeposits').textContent = stats.totalDeposits.toFixed(2) + " $";
    document.getElementById('totalWithdrawals').textContent = stats.totalWithdrawals.toFixed(2) + " $";
    
    // Thống kê nâng cao
    document.getElementById('winLossRatio').textContent = `${winRatio.toFixed(2)}% / ${lossRatio.toFixed(2)}%`;
    document.getElementById('maxWinStreak').textContent = `${stats.maxWinStreak}`;
    document.getElementById('maxLossStreak').textContent = `${stats.maxLossStreak}`;
    document.getElementById('avgProfitLoss').textContent = `${stats.avgProfitLoss.toFixed(2)} $`;
    
    // Đổi màu PNL tổng
    const totalPnlElement = document.getElementById('totalProfitLoss');
    totalPnlElement.className = 'summary-value';
    if(finalProfitLoss > 0.01) {
        totalPnlElement.classList.add('positive');
    } else if (finalProfitLoss < -0.01) {
        totalPnlElement.classList.add('negative');
    }
}

// --- LOGIC BIỂU ĐỒ (Chart.js) ---

function drawChart() {
    if (pnlChartInstance) {
        pnlChartInstance.destroy(); // Hủy biểu đồ cũ nếu có
    }
    
    if(transactions.length === 0) {
        document.getElementById('chartSection').style.display = 'none';
        return;
    }
    document.getElementById('chartSection').style.display = 'block';

    // Sắp xếp theo ngày TĂNG DẦN để biểu đồ đi từ trái sang phải
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); 
    
    const labels = sortedTransactions.map(t => t.date);
    const pnlData = sortedTransactions.map(t => t.profitLoss);

    // Tính toán Cumulative PNL (Lãi ròng cộng dồn)
    let cumulativePnl = 0;
    const cumulativeData = pnlData.map(pnl => {
        cumulativePnl += pnl;
        return cumulativePnl;
    });

    const ctx = pnlChartCanvas.getContext('2d');
    pnlChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'PNL Hàng Ngày ($)',
                data: pnlData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                yAxisID: 'y'
            },
            {
                label: 'PNL Cộng Dồn ($)',
                data: cumulativeData,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                yAxisID: 'y1',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'PNL và Tăng Trưởng Vốn Theo Ngày' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'PNL Hàng Ngày ($)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'PNL Cộng Dồn ($)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// --- LOGIC EXPORT/IMPORT EXCEL (Giữ logic cốt lõi) ---

function exportToExcelByMonth() {
    const selectedMonth = document.getElementById("exportMonth").value;
    const selectedYear = document.getElementById("exportYear").value;
    
    let filteredTransactions = [...transactions]; // Sao chép mảng
    
     if (!selectedYear && selectedMonth !== "") {
         showStatusMessage("Vui lòng nhập năm để lọc theo tháng.", 'error');
         return;
     }

    // Lọc theo tháng và năm
    if (selectedYear) {
         filteredTransactions = filteredTransactions.filter(transaction => {
             const transactionDate = moment(transaction.date);
             return transactionDate.year() == selectedYear &&
                    (selectedMonth === "" || transactionDate.month() == selectedMonth);
         });
    }

    if (!filteredTransactions || filteredTransactions.length === 0) {
        showStatusMessage("Không có giao dịch nào phù hợp để xuất.", 'error');
        return;
    }
    
    // Sắp xếp theo ngày tăng dần cho file Excel
     filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const data = [
        ["Date", "Vốn ban đầu", "PNL", "%", "Số dư cuối"],
        ...filteredTransactions.map(t => [
            t.date,
            t.initialCapital,
            t.profitLoss,
            t.profitPercentage,
            t.finalBalance
        ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Định dạng cột số
    ws['!cols'] = [ { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 } ];
     for (let R = 1; R < data.length; ++R) {
         for (let C = 1; C <= 4; ++C) {
             const cell_address = { c: C, r: R };
             const cell_ref = XLSX.utils.encode_cell(cell_address);
             if (ws[cell_ref]) {
                 ws[cell_ref].t = 'n';
                 ws[cell_ref].z = (C === 3) ? '0.00"%"' : '#,##0.00'; // Phần trăm cho cột 3, số cho các cột khác
             }
         }
     }

    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

     let fileName = "transactions_all.xlsx";
     if (selectedYear) {
         if (selectedMonth !== "") {
             const monthNum = parseInt(selectedMonth) + 1;
             fileName = `transactions_${monthNum.toString().padStart(2,'0')}_${selectedYear}.xlsx`;
         } else {
             fileName = `transactions_${selectedYear}.xlsx`;
         }
     }

     XLSX.writeFile(wb, fileName);
     showStatusMessage('Đã xuất dữ liệu ra file Excel thành công!', 'success');
}

function importFromExcel() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        showStatusMessage("Vui lòng chọn một file Excel.", 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Sử dụng raw: false để XLSX tự cố gắng chuyển đổi ngày tháng tốt hơn
            const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'YYYY-MM-DD'});

            if (excelData.length < 2) {
               showStatusMessage("File Excel trống hoặc không có dữ liệu.", 'error');
               return;
            }

            const header = excelData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
            const dateIndex = header.indexOf("date");
            const initialCapitalIndex = header.indexOf("vốn ban đầu");
            const finalBalanceIndex = header.indexOf("số dư cuối");

             if (dateIndex === -1 || initialCapitalIndex === -1 || finalBalanceIndex === -1) {
                 showStatusMessage("File Excel phải chứa các cột 'Date', 'Vốn ban đầu', và 'Số dư cuối'.", 'error');
                 return;
             }

            let newTransactions = [];
            let skippedCount = 0;

            for (let i = 1; i < excelData.length; i++) {
                const row = excelData[i];
                let dateStr;

                // Xử lý Ngày tháng bằng Moment.js để nhất quán
                 const dateInput = row[dateIndex];
                 if (dateInput) {
                     let mDate;
                     // Thử parse theo định dạng đã xuất ra (YYYY-MM-DD)
                     mDate = moment(dateInput, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], true);
                     
                     // Xử lý trường hợp Excel date number (raw: false có thể trả về số)
                     if (!mDate.isValid() && typeof dateInput === 'number') {
                          // Excel date number
                          mDate = moment(new Date(1899, 11, 30).getTime() + dateInput * 24 * 60 * 60 * 1000);
                     }
                     
                     if (mDate && mDate.isValid()){
                          dateStr = mDate.format('YYYY-MM-DD');
                      } else {
                          console.warn(`Ngày không hợp lệ ở dòng ${i + 1}: ${dateInput}`);
                          skippedCount++;
                          continue;
                      }
                 } else {
                     console.warn(`Ngày bị thiếu ở dòng ${i + 1}.`);
                     skippedCount++;
                     continue;
                 }
                
                // Lấy và kiểm tra giá trị số
                const initialCapital = parseFloat(row[initialCapitalIndex]);
                const finalBalance = parseFloat(row[finalBalanceIndex]);

                 if (isNaN(initialCapital) || initialCapital < 0 || isNaN(finalBalance)) {
                     console.warn(`Dữ liệu không hợp lệ ở dòng ${i + 1}. Vốn: ${row[initialCapitalIndex]}, Số dư: ${row[finalBalanceIndex]}`);
                     skippedCount++;
                     continue;
                 }

                const { profitLoss, profitPercentage } = calculateProfitLossFromValues(initialCapital, finalBalance);

                newTransactions.push({
                    id: createUniqueId(), // GÁN ID DUY NHẤT
                    date: dateStr,
                    initialCapital,
                    finalBalance,
                    profitLoss: parseFloat(profitLoss),
                    profitPercentage: parseFloat(profitPercentage)
                });
            }

            // Xử lý hợp nhất (Giữ logic cũ, ưu tiên hỏi Ghi đè/Bỏ qua)
            if (newTransactions.length > 0) {
                let currentTransactions = JSON.parse(localStorage.getItem('transactions')) || [];
                const newTransactionsByDate = new Map();
                newTransactions.forEach(nt => {
                    if (!newTransactionsByDate.has(nt.date)) {
                        newTransactionsByDate.set(nt.date, []);
                    }
                    newTransactionsByDate.get(nt.date).push(nt);
                });

                let finalTransactions = [...currentTransactions];
                let addedCount = 0;
                let updatedCount = 0;

                newTransactionsByDate.forEach((dailyNewTransactions, date) => {
                    const existingIndices = finalTransactions.map((t, idx) => t.date === date ? idx : -1).filter(idx => idx !== -1);

                    if (existingIndices.length > 0) {
                        const choice = confirm(`Ngày ${date} đã có ${existingIndices.length} giao dịch. Bạn muốn Ghi đè (OK) hay Bỏ qua (Cancel) các giao dịch mới cho ngày này?`);
                        if (choice) {
                            existingIndices.reverse().forEach(idx => finalTransactions.splice(idx, 1));
                            finalTransactions.push(...dailyNewTransactions);
                            updatedCount += dailyNewTransactions.length;
                        } else {
                            skippedCount += dailyNewTransactions.length;
                        }
                    } else {
                        finalTransactions.push(...dailyNewTransactions);
                        addedCount += dailyNewTransactions.length;
                    }
                });

                // Cập nhật lại biến transactions toàn cục và lưu trữ
                transactions = finalTransactions;
                localStorage.setItem('transactions', JSON.stringify(transactions));
                loadAllTransactions(); // Tải lại toàn bộ
                
                showStatusMessage(`Nhập Excel hoàn tất!\n- Đã thêm: ${addedCount} giao dịch\n- Đã ghi đè/cập nhật: ${updatedCount} giao dịch\n- Đã bỏ qua: ${skippedCount} giao dịch`, 'success');
            } else if (skippedCount > 0) {
                 showStatusMessage(`Quá trình nhập hoàn tất nhưng có ${skippedCount} dòng bị bỏ qua do lỗi dữ liệu hoặc ngày không hợp lệ.`, 'error');
            } else {
                showStatusMessage("Không tìm thấy dữ liệu giao dịch hợp lệ trong file Excel.", 'error');
            }

        } catch (error) {
            console.error("Lỗi khi nhập file Excel:", error);
            showStatusMessage("Đã xảy ra lỗi khi đọc hoặc xử lý file Excel. Vui lòng kiểm tra định dạng file và dữ liệu.", 'error');
        } finally {
             fileInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}
