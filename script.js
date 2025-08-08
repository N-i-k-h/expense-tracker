// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const calcIcon = document.getElementById('calcIcon');
const calculator = document.getElementById('calculator');
const calcDisplay = document.getElementById('calcDisplay');
const calcButtons = document.querySelectorAll('.calc-btn');
const totalExpensesEl = document.getElementById('totalExpenses');
const monthlyExpensesEl = document.getElementById('monthlyExpenses');
const categoryCountEl = document.getElementById('categoryCount');

// Initialize expenses array from localStorage or empty array
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// Chart initialization
const ctx = document.getElementById('expenseChart').getContext('2d');
let expenseChart;

// Initialize the date field to today
document.getElementById('date').valueAsDate = new Date();

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.querySelector('span').textContent = isLight ? 'Dark Mode' : 'Light Mode';
    themeToggle.querySelector('i').className = isLight ? 'fas fa-moon' : 'fas fa-sun';

    // Update chart if it exists
    if (expenseChart) {
        expenseChart.destroy();
        renderChart();
    }
});

// Form submission
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value || 'No description';
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const expense = {
        id: Date.now(),
        amount,
        category,
        description,
        date
    };

    expenses.push(expense);
    saveExpenses();
    renderExpenses();
    renderChart();
    updateStats();

    // Reset form
    expenseForm.reset();
    document.getElementById('date').valueAsDate = new Date();
});

// Calculator toggle
calcIcon.addEventListener('click', () => {
    calculator.classList.toggle('open');
});

// Calculator logic
let currentInput = '0';
let previousInput = null;
let operation = null;
let shouldResetScreen = false;

calcButtons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');

        if (!isNaN(value) || value === '.') {
            handleNumberInput(value);
        } else if (value === 'C') {
            resetCalculator();
        } else if (value === 'backspace') {
            backspace();
        } else if (value === '=') {
            calculate();
        } else {
            handleOperator(value);
        }

        updateDisplay();
    });
});

function handleNumberInput(value) {
    if (currentInput === '0' || shouldResetScreen) {
        currentInput = value;
        shouldResetScreen = false;
    } else {
        currentInput += value;
    }
}

function handleOperator(op) {
    if (operation !== null) calculate();
    previousInput = currentInput;
    operation = op;
    shouldResetScreen = true;
}

function calculate() {
    if (operation === null || shouldResetScreen) return;

    let result;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);

    if (isNaN(prev) || isNaN(current)) return;

    switch (operation) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            if (current === 0) {
                result = 'Error';
            } else {
                result = prev / current;
            }
            break;
        case '%':
            result = prev % current;
            break;
        default:
            return;
    }

    currentInput = result.toString();
    operation = null;
    previousInput = null;
}

function resetCalculator() {
    currentInput = '0';
    previousInput = null;
    operation = null;
}

function backspace() {
    currentInput = currentInput.slice(0, -1);
    if (currentInput === '') currentInput = '0';
}

function updateDisplay() {
    calcDisplay.textContent = currentInput;
}

// Save expenses to localStorage
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Render expenses in the table
function renderExpenses() {
    if (expenses.length === 0) {
        expenseList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort expenses by date (newest first)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    expenses.forEach(expense => {
        const date = new Date(expense.date).toLocaleDateString();
        const amount = expense.amount.toFixed(2);

        html += `
            <tr>
                <td>${date}</td>
                <td>
                    <span class="category-badge">${getCategoryIcon(expense.category)} ${formatCategory(expense.category)}</span>
                </td>
                <td>${expense.description}</td>
                <td>₹${amount}</td>
                <td>
                    <button class="delete-btn" data-id="${expense.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    expenseList.innerHTML = html;

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = parseInt(button.getAttribute('data-id'));
            deleteExpense(id);
        });
    });
}

// Delete an expense
function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    saveExpenses();
    renderExpenses();
    renderChart();
    updateStats();
}

// Format category for display
function formatCategory(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        food: '<i class="fas fa-utensils"></i>',
        shopping: '<i class="fas fa-shopping-bag"></i>',
        transport: '<i class="fas fa-bus"></i>',
        entertainment: '<i class="fas fa-film"></i>',
        bills: '<i class="fas fa-file-invoice-dollar"></i>',
        gym: '<i class="fas fa-dumbbell"></i>',
        travel: '<i class="fas fa-plane"></i>',
        health: '<i class="fas fa-heartbeat"></i>',
        education: '<i class="fas fa-graduation-cap"></i>',
        other: '<i class="fas fa-wallet"></i>'
    };

    return icons[category] || icons.other;
}

// Render the chart
function renderChart() {
    if (expenseChart) {
        expenseChart.destroy();
    }

    if (expenses.length === 0) {
        return;
    }

    // Group expenses by category
    const categories = {};
    expenses.forEach(expense => {
        if (!categories[expense.category]) {
            categories[expense.category] = 0;
        }
        categories[expense.category] += expense.amount;
    });

    const labels = Object.keys(categories).map(formatCategory);
    const data = Object.values(categories);

    // Get accent color for the chart
    const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-accent').trim();

    // Generate colors for each category
    const backgroundColors = generateColors(labels.length, accentColor);

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'transparent',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--primary-text').trim(),
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.parsed.toFixed(2)}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Generate colors for the chart
function generateColors(count, baseColor) {
    const colors = [];
    const baseRGB = hexToRgb(baseColor);

    for (let i = 0; i < count; i++) {
        const factor = 0.8 + (i * 0.15);
        const r = Math.min(255, Math.floor(baseRGB.r * factor));
        const g = Math.min(255, Math.floor(baseRGB.g * factor));
        const b = Math.min(255, Math.floor(baseRGB.b * factor));
        colors.push(`rgb(${r}, ${g}, ${b})`);
    }

    return colors;
}

// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 0};
}

// Update statistics
function updateStats() {
    // Total expenses
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    totalExpensesEl.textContent = total.toFixed(2);

    // Monthly expenses (current month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthly = expenses.reduce((sum, expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            return sum + expense.amount;
        }
        return sum;
    }, 0);

    monthlyExpensesEl.textContent = monthly.toFixed(2);

    // Count of categories used
    const uniqueCategories = new Set(expenses.map(expense => expense.category));
    categoryCountEl.textContent = uniqueCategories.size;
}

// Initialize the app
function init() {
    renderExpenses();
    renderChart();
    updateStats();
}

// Start the app
init();
