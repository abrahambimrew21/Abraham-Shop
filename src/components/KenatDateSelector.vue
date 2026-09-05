<script lang="ts" setup>
import { useDatePicker, type CalendarMode } from '@/libs/KenatDatePicker';
import { initDropdowns, initTooltips } from 'flowbite';
import Kenat from 'kenat';
import { onMounted, ref, useId, watch } from 'vue';

const emit = defineEmits(['selectedDate', 'selectedDateEthiopian']);
const calendarMode = ref<CalendarMode>("month");
const dropdownId = `kenat-date-dropdown-${useId()}`;
const triggerId = `${dropdownId}-trigger`;

const picker = useDatePicker();
const yearlyCalendar = Kenat.getYearCalendar(picker.state.selectedDate.value.year);

const toggleCalendarMode = () => {

    switch (calendarMode.value) {
        case "month":
            calendarMode.value = 'year';
            break;
        case 'year':
            calendarMode.value = 'decade';
            break;
        case 'decade':
            calendarMode.value = 'month';
            break;
    }
}

watch(picker.state.selectedDate, (newSelectedDate) => {
    const kenatDate = new Kenat(`${newSelectedDate.year}/${newSelectedDate.month}/${newSelectedDate.day}`).getGregorian();
    
    emit("selectedDate", new Date(kenatDate.year, kenatDate.month - 1, kenatDate.day));
    emit("selectedDateEthiopian", picker.state.formatted);
})

onMounted(() => {
    initTooltips();
    initDropdowns();
})
</script>
<template>

    <div class="flex">

            <button :id="triggerId" :data-dropdown-toggle="dropdownId"
            class="block max-w-96 pe-3 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand px-3 py-2.5 shadow-xs placeholder:text-body cursor-pointer"
            type="button">
            {{ picker.state.formatted }}
        </button>

        <!-- Dropdown menu -->
        <div :id="dropdownId"
            class="z-10 hidden bg-neutral-primary-medium border border-default-medium rounded-base shadow-lg">
            <div class="p-2 text-sm text-body font-medium" :aria-labelledby="triggerId">

                <div class="datepicker-header">
                    <div class="datepicker-controls flex justify-between mb-2">
                        <button type="button"
                            class="bg-neutral-primary-medium rounded-base text-body hover:bg-neutral-tertiary-medium hover:text-heading text-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-tertiary prev-btn"
                            @click="() => {
                                calendarMode === 'month' ? picker.actions.prevMonth() :
                                    calendarMode === 'year' ? picker.actions.prevYear() :
                                        calendarMode === 'decade' ? picker.actions.selectDate({
                                            ethiopian: {
                                                day: 1,
                                                month: 1,
                                                year: picker.state.selectedDate.value.year - 10
                                            },
                                            isToday: false,
                                        }) : null;
                            }">
                            <svg class="w-4 h-4 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M13 5H1m0 0 4 4M1 5l4-4"></path>
                            </svg>
                        </button>

                        <button type="button"
                            class="text-sm rounded-base text-heading bg-neutral-primary-medium font-medium py-2.5 px-5 hover:bg-neutral-tertiary-medium focus:outline-none focus:ring-2 focus:ring-neutral-tertiary view-switch"
                            @click="() => toggleCalendarMode()">
                            <template v-if="calendarMode === 'month'">
                                {{ picker.state.grid.value?.monthName }}
                                {{ picker.state.grid.value?.year }}
                            </template>
                            <template v-if="calendarMode === 'year'">
                                {{ picker.state.grid.value?.year }}
                            </template>
                            <template v-if="calendarMode === 'decade'">
                                {{ picker.state.grid.value?.year }} - {{ (picker.state.grid.value?.year || 0) + 10 }}
                            </template>
                        </button>

                        <button type="button"
                            class="bg-neutral-primary-medium rounded-base text-body hover:bg-neutral-tertiary-medium hover:text-heading text-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-tertiary next-btn"
                            @click="() => {
                                calendarMode === 'month' ? picker.actions.nextMonth() :
                                    calendarMode === 'year' ? picker.actions.nextYear() :
                                        calendarMode === 'decade' ? picker.actions.selectDate({
                                            ethiopian: {
                                                day: 1,
                                                month: 1,
                                                year: picker.state.selectedDate.value.year + 10
                                            },
                                            isToday: false,
                                        }) : null;
                            }">
                            <svg class="w-4 h-4 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                    stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="datepicker-main p-1">
                    <div v-if="calendarMode === 'month'" class="datepicker-view flex">
                        <div class="days">
                            <div class="days-of-week grid grid-cols-7 mb-1">
                                <span v-for="head in picker.state.headers.value"
                                    class="dow text-center h-6 leading-6 text-sm font-medium text-body">
                                    {{ head.slice(0, 2) }}
                                </span>
                            </div>
                            <div class="datepicker-grid w-64 grid grid-cols-7">
                                <span v-for="day in picker.state.days.value"
                                    class="datepicker-cell hover:bg-neutral-tertiary-medium block flex-1 leading-9 border-0 rounded-base cursor-pointer text-center text-body font-medium text-sm day"
                                    @click="() => picker.actions.selectDate(day)">{{ day?.ethiopian?.day }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="calendarMode === 'year'" class="datepicker-view flex">
                        <div class="days">
                            <div class="datepicker-grid w-64 grid grid-cols-4">
                                <span v-for="month in yearlyCalendar"
                                    class="datepicker-cell hover:bg-neutral-tertiary-medium block flex-1 leading-9 border-0 rounded-base cursor-pointer text-center text-body font-medium text-sm day"
                                    @click="() => {
                                        picker.actions.selectDate({
                                            ethiopian: {
                                                day: 1,
                                                month: month.month,
                                                year: Number(picker.state.selectedDate.value.year)
                                            },
                                            isToday: false,
                                        })

                                        calendarMode = 'month'
                                    }">
                                    {{
                                        month.monthName
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-if="calendarMode === 'decade'" class="datepicker-view flex">
                        <div class="days">
                            <div class="datepicker-grid w-64 grid grid-cols-4">
                                <span
                                    v-for="year in Array.from({ length: 10 }, (_, i) => picker.state.selectedDate.value.year + i)"
                                    class="datepicker-cell hover:bg-neutral-tertiary-medium block flex-1 leading-9 border-0 rounded-base cursor-pointer text-center text-body font-medium text-sm day"
                                    @click="
                                        () => {
                                            picker.actions.selectDate({
                                                ethiopian: {
                                                    day: 1,
                                                    month: 1,
                                                    year: year
                                                },
                                                isToday: false,
                                            })

                                            calendarMode = 'month'
                                        }">
                                    {{
                                        year
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>
