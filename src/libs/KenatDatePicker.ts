import { computed, ref, shallowRef, watch, type Ref } from 'vue';
import Kenat, { MonthGrid } from 'kenat';

export type CalendarMode = "month" | "year" | "decade";

export interface EthiopianDate {
    year: number;
    month: number;
    day: number;
}

export interface CalendarDay {
    ethiopian?: EthiopianDate;
    isToday?: boolean;
    [key: string]: unknown;
}

export interface CalendarGrid {
    // headers: string[];
    // days: Array<CalendarDay | null>;

    headers: string[];
    days: CalendarDay[];
    year: number;
    month: number;
    monthName: string;
    up: () => {
        headers: string[];
        days: CalendarDay[];
        year: number;
        month: number;
        monthName: string;
        up: /*elided*/ any;
        down: () => /*elided*/ any;
    };
    down: () => {
        headers: string[];
        days: CalendarDay[];
        year: number;
        month: number;
        monthName: string;
        up: () => /*elided*/ any;
        down: /*elided*/ any;
    };
}

export interface DatePickerOptions {
    initialDate?: EthiopianDate | null;
    weekdayLang?: 'amharic' | 'english';
    useGeez?: boolean;
    weekStart?: number;
    onDateSelect?: (date: EthiopianDate) => void;
}

interface MonthGridLike {
    year: number;
    month: number;
    up(): void;
    down(): void;
    generate(): CalendarGrid;
}

export interface DatePickerState {
    selectedDate: Ref<EthiopianDate>;
    formatted: Ref<string>;
    open: Ref<boolean>;
    grid: Ref<CalendarGrid | null>;
    headers: Ref<string[]>;
    days: Ref<Array<CalendarDay | null>>;
    inputRef: Ref<HTMLElement | null>;
    isCurrentMonth: Ref<boolean>;
}

export interface DatePickerActions {
    toggleOpen: () => void;
    close: () => void;
    selectDate: (day: CalendarDay | null | undefined) => void;
    nextMonth: () => void;
    prevMonth: () => void;
    nextYear: () => void;
    prevYear: () => void;
    goToToday: () => void;
}

export interface UseDatePickerReturn {
    state: DatePickerState;
    actions: DatePickerActions;
}

function isEthiopianDate(value: unknown): value is EthiopianDate {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'year' in value &&
        'month' in value &&
        'day' in value &&
        typeof (value as EthiopianDate).year === 'number' &&
        typeof (value as EthiopianDate).month === 'number' &&
        typeof (value as EthiopianDate).day === 'number',
    );
}

function normalizeDate(value?: EthiopianDate | null): EthiopianDate {
    if (isEthiopianDate(value)) {
        return { year: value.year, month: value.month, day: value.day };
    }
    const fallback = Kenat.now().getEthiopian();
    return { year: fallback.year, month: fallback.month, day: fallback.day };
}

export function useDatePicker(options: DatePickerOptions = {}): UseDatePickerReturn {
    const {
        initialDate,
        weekdayLang = 'amharic',
        useGeez = false,
        weekStart = 1,
        onDateSelect,
    } = options;

    const selectedDate = ref<EthiopianDate>(normalizeDate(initialDate));
    const open = ref(false);
    const inputRef = ref<HTMLElement | null>(null);

    // shallowRef: MonthGrid is a class instance with methods — deep reactivity via
    // ref() would proxy its internals, break internal state, and cause circular
    // references that crash JSON.stringify.
    const instance = shallowRef<MonthGridLike | null>(null);

    // shallowRef: the grid object may contain back-references; shallow is enough
    // since we always replace the whole object on each generate() call.
    const grid = shallowRef<CalendarGrid | null>(null);

    const rebuildInstance = () => {
        const next = new MonthGrid({
            year: selectedDate.value.year,
            month: selectedDate.value.month,
            weekdayLang,
            useGeez,
            weekStart,
        }) as unknown as MonthGridLike;
        instance.value = next;
        grid.value = next.generate();
    };

    // Regenerate the grid from the instance's *current* year/month.
    // Does NOT push selectedDate back onto the instance — callers that need
    // the instance to reflect a new month (navigation) do that themselves first.
    const refreshGrid = () => {
        if (!instance.value) return;
        grid.value = instance.value.generate();
    };

    // When selectedDate changes (e.g. after selectDate()), sync the instance
    // position to match and regenerate.
    // Watch the ref itself (not .value) to avoid deep serialization.
    watch(selectedDate, (next) => {
        if (!instance.value) return;
        instance.value.year = next.year;
        instance.value.month = next.month;
        refreshGrid();
    });

    // Build the initial instance before any watchers can fire.
    rebuildInstance();

    // ── Actions ────────────────────────────────────────────────────────────────

    const selectDate = (day: CalendarDay | null | undefined) => {
        if (!day?.ethiopian) return;
        const next = normalizeDate(day.ethiopian);
        selectedDate.value = next;   // triggers the watch above
        onDateSelect?.(next);
        open.value = false;
    };

    const navigate = (action: 'nextMonth' | 'prevMonth' | 'nextYear' | 'prevYear') => {
        if (!instance.value) return;

        // Mutate the instance first (up/down handle month wrapping internally),
        // then regenerate. Do NOT sync from selectedDate — navigation is
        // independent of the selected date.
        switch (action) {
            case 'nextMonth': instance.value.up(); break;
            case 'prevMonth': instance.value.down(); break;
            case 'nextYear': instance.value.year += 1; break;
            case 'prevYear': instance.value.year -= 1; break;
        }

        refreshGrid();
    };

    const formatDate = (date?: EthiopianDate | null): string => {
        if (!date) return '';
        return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year} E.C`;
    };

    const todayEth = (): EthiopianDate => {
        const eth = Kenat.now().getEthiopian();
        return { year: eth.year, month: eth.month, day: eth.day };
    };

    const goToToday = () => {
        if (!instance.value) return;
        const t = todayEth();
        instance.value.year = t.year;
        instance.value.month = t.month;
        refreshGrid();
    };

    return {
        state: {
            selectedDate,
            formatted: computed(() => formatDate(selectedDate.value)),
            open,
            grid,
            headers: computed(() => grid.value?.headers ?? []),
            days: computed(() => grid.value?.days ?? []),
            inputRef,
            isCurrentMonth: computed(() => {
                if (!instance.value) return false;
                const t = todayEth();
                return instance.value.year === t.year && instance.value.month === t.month;
            }),
        },
        actions: {
            toggleOpen: () => { open.value = !open.value; },
            close: () => { open.value = false; },
            selectDate,
            nextMonth: () => navigate('nextMonth'),
            prevMonth: () => navigate('prevMonth'),
            nextYear: () => navigate('nextYear'),
            prevYear: () => navigate('prevYear'),
            goToToday,
        },
    };
}
