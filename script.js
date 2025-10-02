// --- KHAI BÁO BIẾN TOÀN CỤC ---
const transactionTableBody = document.getElementById('transactionTable').getElementsByTagName('tbody')[0];
const loadMoreBtn = document.getElementById('loadMoreBtn');
const statusMessage = document.getElementById('statusMessage');
const pnlChartCanvas = document.getElementById('pnlChart');
const TRANSACTIONS_PER_PAGE = 10;
let transactions = [];
let currentPage = 1;
let pnlChartInstance = null; // Biến lưu instance của Chart.js

// --- CHỨC NĂNG HỖ TRỢ ĐỊNH DẠNG SỐ ---

// Hàm định dạng số: loại bỏ .00 nếu là số nguyên, giữ 2 số thập phân nếu cần
function formatCurrency(value, currencySymbol = '$') {
    const num = parseFloat(value);
    if (isNaN(num)) return `0.00 ${currencySymbol}`;
    if (Math.abs(num - Math.round(num)) < 0.0001) {
        return `${Math.round(num)} ${currencySymbol}`;
    }
    return `${num.toFixed(2)} ${currencySymbol}`;
}

function formatPercentage(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return `0.00%`;
    // Giữ nguyên 2 chữ số thập phân cho phần trăm (tỉ lệ thường cần độ chính xác)
    return `${num.toFixed(2)}%`; 
}

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
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    currentPage = 1;
    displayTransactions();
    updateSummary();
    drawChart(); // Đảm bảo biểu đồ được vẽ
}

// ... (Các hàm loadMoreTransactions, calculateProfitLossFromValues, calculateProfitLoss, createUniqueId, addTransaction, confirmDeleteTransaction, deleteTransaction, updateTransactionData, clearForm, resetData, showStatusMessage, appendTransactionToTable giữ nguyên logic) ...

// Hiển thị giao dịch (áp dụng logic phân trang)
function displayTransactions() {
    transactionTableBody.innerHTML = '';
    const startIndex = 0;
    const endIndex = currentPage * TRANSACTIONS_PER_PAGE;
    
    const transactionsToDisplay = transactions.slice(startIndex, endIndex);

    transactionsToDisplay.forEach((transaction, index) => {
        appendTransactionToTable(transaction, transactions.indexOf(transaction)); 
    });

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

// Hàm tính toán PNL và % từ Vốn và Số dư
function calculateProfitLossFromValues(initialCapital, finalBalance) {
    initialCapital = parseFloat(initialCapital) || 0;
    finalBalance = parseFloat(finalBalance) || 0;

    const profitLoss = finalBalance - initialCapital;
    const profitPercentage = (initialCapital !== 0) ? (profitLoss / initialCapital) * 100 : 0;
    return {
        // Giữ nguyên toFixed(2) để đảm bảo độ chính xác cho việc lưu trữ và hiển thị trong bảng
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

    if (transactions.length > 0 && !initialCapitalInput.value && finalBalanceInput === document.activeElement) {
        const lastTransaction = transactions[0]; 
        initialCapitalInput.value = lastTransaction.finalBalance.toFixed(2);
        initialCapital = parseFloat(initialCapitalInput.value);
    }
    
    if (!isNaN(initialCapital) && !isNaN(finalBalance)) {
        return calculateProfitLossFromValues(initialCapital, finalBalance);
    } 
    return null;
}

// Tạo ID duy nhất
function createUniqueId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function addTransaction() {
    const date = document.getElementById('date').value;
    const initialCapitalInput = document.getElementById('initialCapital');
    const finalBalance = parseFloat(document.getElementById('finalBalance').value);
    
    if (!initialCapitalInput.value && transactions.length > 0) {
        initialCapitalInput.value = transactions[0].finalBalance.toFixed(2);
    }
    const initialCapital = parseFloat(initialCapitalInput.value);

    if (date && !isNaN(initialCapital) && initialCapital >= 0 && !isNaN(finalBalance)) {
        const { profitLoss, profitPercentage } = calculateProfitLossFromValues(initialCapital, finalBalance);

        const newTransaction = {
            id: createUniqueId(), 
            date,
            initialCapital,
            finalBalance,
            profitLoss: parseFloat(profitLoss),
            profitPercentage: parseFloat(profitPercentage)
        };
        
        transactions.push(newTransaction);
        
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        clearForm();
        loadAllTransactions(); 
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

function updateTransactionData(id, field, value) {
    const editedValue = parseFloat(value);
    const transactionIndex = transactions.findIndex(t => t.id === id);

    if (transactionIndex === -1) return; 

     if (isNaN(editedValue) || (field === 'initialCapital' && editedValue < 0)) {
         showStatusMessage('Vui lòng nhập một giá trị số hợp lệ (Vốn ban đầu không được âm).', 'error');
         const rowElement = document.querySelector(`tr[data-id="${id}"]`);
         if(rowElement){
             const oldValue = transactions[transactionIndex][field].toFixed(2);
             const cellIndex = (field === 'initialCapital') ? 1 : 4; 
             rowElement.cells[cellIndex].textContent = oldValue;
         }
         return;
     }

    transactions[transactionIndex][field] = editedValue;
    
    const { profitLoss, profitPercentage } = calculateProfitLossFromValues(
         transactions[transactionIndex].initialCapital,
         transactions[transactionIndex].finalBalance
     );
    transactions[transactionIndex].profitLoss = parseFloat(profitLoss);
    transactions[transactionIndex].profitPercentage = parseFloat(profitPercentage);
    
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    loadAllTransactions(); 
    showStatusMessage('Cập nhật giao dịch thành công.', 'success');
}

function clearForm() {
    document.getElementById('date').value = moment().format('YYYY-MM-DD'); 
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
    statusMessage.className = type; 
    statusMessage.classList.add('visible');
    
    setTimeout(() => {
        statusMessage.classList.remove('visible');
    }, 3500);
}

function appendTransactionToTable(transaction, originalIndexInSortedArray) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', transaction.id);

    const profitClass = transaction.profitLoss >= 0 ? 'positive' : 'negative';
    let capitalChangeClass = '';
    
    if (originalIndexInSortedArray < transactions.length - 1) { 
        const previousTransaction = transactions[originalIndexInSortedArray + 1];
        const previousBalance = previousTransaction ? previousTransaction.finalBalance : 0;
        const currentInitialCapital = transaction.initialCapital;
        const difference = currentInitialCapital - previousBalance;

        if (difference > 0.01) {
            capitalChangeClass = 'capital-deposit'; 
        } else if (difference < -0.01) {
            capitalChangeClass = 'capital-withdrawal'; 
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
        return { totalDays: 0, finalBalance: 0, totalProfitLoss: 0, totalDeposits: 0, totalWithdrawals: 0, winCount: 0, lossCount: 0, avgProfitLoss: 0 };
    }

    const uniqueDates = new Set();
    let totalProfitLoss = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let winCount = 0;
    let lossCount = 0;

    const sortedByDateAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); 
    let previousBalance = 0;
    
    sortedByDateAsc.forEach((transaction, index) => {
        const currentInitialCapital = transaction.initialCapital;
        const currentFinalBalance = transaction.finalBalance;
        const currentProfitLoss = transaction.profitLoss;

        uniqueDates.add(transaction.date);
        totalProfitLoss += currentProfitLoss;

        if (index === 0) {
             totalDeposits = currentInitialCapital; 
        } else {
             const capitalDifference = currentInitialCapital - previousBalance;
             if (capitalDifference > 0.01) { 
                 totalDeposits += capitalDifference;
             } else if (capitalDifference < -0.01) { 
                 totalWithdrawals += Math.abs(capitalDifference);
             }
        }
        previousBalance = currentFinalBalance;

        if (currentProfitLoss > 0.01) {
            winCount++;
        } else if (currentProfitLoss < -0.01) {
            lossCount++;
        }
    });

    const totalTradingDays = winCount + lossCount;
    const avgProfitLoss = totalTradingDays > 0 ? totalProfitLoss / totalTradingDays : 0;
    
    const finalBalance = transactions[0].finalBalance; 

    return {
        totalDays: uniqueDates.size,
        finalBalance: finalBalance, 
        totalProfitLoss,
        totalDeposits,
        totalWithdrawals,
        winCount,
        lossCount,
        totalTradingDays,
        avgProfitLoss
    };
}


function updateSummary() {
    const stats = calculateAdvancedStats();
    
    const finalProfitLoss = stats.finalBalance - stats.totalDeposits + stats.totalWithdrawals;

    const winRatio = stats.totalTradingDays > 0 ? (stats.winCount / stats.totalTradingDays) * 100 : 0;
    const lossRatio = stats.totalTradingDays > 0 ? (stats.lossCount / stats.totalTradingDays) * 100 : 0;

    // ĐỊNH DẠNG SỐ VỚI HÀM MỚI
    document.getElementById('totalDays').textContent = stats.totalDays; // Giữ nguyên số nguyên
    document.getElementById('totalProfitLoss').textContent = formatCurrency(finalProfitLoss);
    document.getElementById('finalBalanceSummary').textContent = formatCurrency(stats.finalBalance);
    document.getElementById('totalDeposits').textContent = formatCurrency(stats.totalDeposits);
    document.getElementById('totalWithdrawals').textContent = formatCurrency(stats.totalWithdrawals);
    
    document.getElementById('winLossRatio').textContent = `${formatPercentage(winRatio)} / ${formatPercentage(lossRatio)}`;
    document.getElementById('avgProfitLoss').textContent = formatCurrency(stats.avgProfitLoss);
    
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
    // FIX: Đảm bảo hiển thị khi có dữ liệu
    document.getElementById('chartSection').style.display = 'block'; 

    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); 
    
    const labels = sortedTransactions.map(t => t.date);
    const pnlData = sortedTransactions.map(t => t.profitLoss);

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

// ... (Các hàm Export/Import Excel giữ nguyên) ...

function exportToExcelByMonth() {
    const selectedMonth = document.getElementById("exportMonth").value;
    const selectedYear = document.getElementById("exportYear").value;
    
    let filteredTransactions = [...transactions]; 
    
     if (!selectedYear && selectedMonth !== "") {
         showStatusMessage("Vui lòng nhập năm để lọc theo tháng.", 'error');
         return;
     }

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

    ws['!cols'] = [ { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 } ];
     for (let R = 1; R < data.length; ++R) {
         for (let C = 1; C <= 4; ++C) {
             const cell_address = { c: C, r: R };
             const cell_ref = XLSX.utils.encode_cell(cell_address);
             if (ws[cell_ref]) {
                 ws[cell_ref].t = 'n';
                 ws[cell_ref].z = (C === 3) ? '0.00"%"' : '#,##0.00'; 
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

                 const dateInput = row[dateIndex];
                 if (dateInput) {
                     let mDate;
                     mDate = moment(dateInput, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], true);
                     
                     if (!mDate.isValid() && typeof dateInput === 'number') {
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
                
                const initialCapital = parseFloat(row[initialCapitalIndex]);
                const finalBalance = parseFloat(row[finalBalanceIndex]);

                 if (isNaN(initialCapital) || initialCapital < 0 || isNaN(finalBalance)) {
                     console.warn(`Dữ liệu không hợp lệ ở dòng ${i + 1}. Vốn: ${row[initialCapitalIndex]}, Số dư: ${row[finalBalanceIndex]}`);
                     skippedCount++;
                     continue;
                 }

                const { profitLoss, profitPercentage } = calculateProfitLossFromValues(initialCapital, finalBalance);

                newTransactions.push({
                    id: createUniqueId(), 
                    date: dateStr,
                    initialCapital,
                    finalBalance,
                    profitLoss: parseFloat(profitLoss),
                    profitPercentage: parseFloat(profitPercentage)
                });
            }

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

                transactions = finalTransactions;
                localStorage.setItem('transactions', JSON.stringify(transactions));
                loadAllTransactions(); 
                
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
