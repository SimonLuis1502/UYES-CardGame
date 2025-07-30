// Helper for numeric input sliders with +/- buttons
export function setupAmountControls(sliderId, displayId, subtractSelector, addSelector) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    const subtractBtn = slider.closest('div').querySelector(subtractSelector);
    const addBtn = slider.closest('div').querySelector(addSelector);

    const updateDisplay = () => {
        display.textContent = slider.value;
    };

    subtractBtn?.addEventListener('click', () => {
        slider.stepDown();
        slider.dispatchEvent(new Event('input'));
        updateDisplay();
    });

    addBtn?.addEventListener('click', () => {
        slider.stepUp();
        slider.dispatchEvent(new Event('input'));
        updateDisplay();
    });

    slider.addEventListener('input', updateDisplay);
    updateDisplay();
}

// Utility for "select all" checkboxes
export function setupSelectAllCheckbox(groupSelector, selectAllId) {
    const checkboxes = Array.from(document.querySelectorAll(groupSelector));
    const selectAll = document.getElementById(selectAllId);

    selectAll?.addEventListener('change', () => {
        checkboxes.forEach(cb => {
            if (cb.id !== selectAllId) cb.checked = selectAll.checked;
        });
    });

    checkboxes.forEach(cb => {
        if (cb.id === selectAllId) return;

        cb.addEventListener('change', () => {
            const allChecked = checkboxes
                .filter(c => c.id !== selectAllId)
                .every(c => c.checked);
            selectAll.checked = allChecked;
        });
    });
}
