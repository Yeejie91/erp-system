import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarEvent, CalendarEventType, Invoice, Activity, SpaceBooking, CustomerFollowUp } from '../types';
import { calendarEventsService, invoicesService, activitiesService, spaceBookingsService, customerFollowUpsService } from '../services/db';

interface CalendarDayEvent {
  date: Date;
  revenue: number;
  calendarEvents: CalendarEvent[];
  activities: Activity[];
  bookings: SpaceBooking[];
  invoices: Invoice[];
  followUps: CustomerFollowUp[];
  upcomingFollowUps: CustomerFollowUp[]; // 即将到期的跟进任务（前3-5天）
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Map<string, CalendarDayEvent>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 加载日历数据
  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const [calendarEventsData, invoicesData, activitiesData, bookingsData, followUpsData] = await Promise.all([
        calendarEventsService.getAll(),
        invoicesService.getAll(),
        activitiesService.getAll(),
        spaceBookingsService.getAll(),
        customerFollowUpsService.getAll()
      ]);

      const newEvents = new Map<string, CalendarDayEvent>();

      monthDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        
        // 筛选当天的日历事件（包括公共假期）
        const dayCalendarEvents = calendarEventsData.filter(event =>
          isSameDay(new Date(event.date), day)
        );
        
        // 筛选当天的活动
        const dayActivities = activitiesData.filter(activity =>
          isSameDay(new Date(activity.startDate), day) ||
          isSameDay(new Date(activity.endDate), day) ||
          (new Date(activity.startDate) <= day && new Date(activity.endDate) >= day)
        );
        
        // 筛选当天的空间预订
        const dayBookings = bookingsData.filter(booking =>
          isSameDay(new Date(booking.startDate), day) ||
          isSameDay(new Date(booking.endDate), day) ||
          (new Date(booking.startDate) <= day && new Date(booking.endDate) >= day)
        );
        
        // 筛选当天的发票
        const dayInvoices = invoicesData.filter(invoice =>
          isSameDay(new Date(invoice.createdAt), day)
        );
        
        // 筛选当天的跟进任务（截止日期）
        const dayFollowUps = followUpsData.filter(followUp =>
          isSameDay(new Date(followUp.dueDate), day) && followUp.status !== 'completed'
        );
        
        // 筛选即将到期的跟进任务（前3-5天）
        const upcomingFollowUps = followUpsData.filter(followUp => {
          if (followUp.status === 'completed') return false;
          const dueDate = new Date(followUp.dueDate);
          const daysUntilDue = differenceInDays(dueDate, day);
          return daysUntilDue >= 3 && daysUntilDue <= 5 && isAfter(dueDate, day);
        });
        
        // 计算当日收入
        const dayRevenue = dayInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        
        newEvents.set(dateKey, {
          date: day,
          revenue: dayRevenue,
          calendarEvents: dayCalendarEvents,
          activities: dayActivities,
          bookings: dayBookings,
          invoices: dayInvoices,
          followUps: dayFollowUps,
          upcomingFollowUps: upcomingFollowUps,
        });
      });

      setEvents(newEvents);
    } catch (error) {
      console.error('加载日历数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const getEventForDate = (date: Date): CalendarDayEvent => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return events.get(dateKey) || { 
      date, 
      revenue: 0, 
      calendarEvents: [], 
      activities: [], 
      bookings: [], 
      invoices: [],
      followUps: [],
      upcomingFollowUps: []
    };
  };

  const getEventColor = (type: CalendarEventType | string) => {
    switch (type) {
      case CalendarEventType.HOLIDAY:
      case 'holiday': return 'bg-red-500';
      case CalendarEventType.STORE_CLOSURE:
      case 'store_closure': return 'bg-gray-500';
      case CalendarEventType.SPECIAL_EVENT:
      case 'special_event': return 'bg-yellow-500';
      case CalendarEventType.REMINDER:
      case 'reminder': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载日历数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 日历头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* 日历网格 */}
      <div className="p-4">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 生成完整的日历网格，包括上个月的末尾和下个月的开头 */}
          {(() => {
            const firstDayOfMonth = startOfMonth(currentDate);
            const lastDayOfMonth = endOfMonth(currentDate);
            const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = 星期日, 1 = 星期一, ...
            
            // 创建完整的日历网格
            const calendarDays = [];
            
            // 添加上个月的末尾天数
            for (let i = startDayOfWeek - 1; i >= 0; i--) {
              const prevDate = new Date(firstDayOfMonth);
              prevDate.setDate(prevDate.getDate() - (i + 1));
              calendarDays.push(prevDate);
            }
            
            // 添加当前月的所有天数
            calendarDays.push(...monthDays);
            
            // 添加下个月的开头天数，使网格完整
            const remainingCells = 42 - calendarDays.length; // 6行 x 7列 = 42个单元格
            for (let i = 1; i <= remainingCells; i++) {
              const nextDate = new Date(lastDayOfMonth);
              nextDate.setDate(nextDate.getDate() + i);
              calendarDays.push(nextDate);
            }
            
            return calendarDays;
          })().map(date => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);
            const dayEvents = getEventForDate(date);
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                className={`
                  relative p-2 h-20 text-left border border-gray-100 rounded-lg transition-colors
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isTodayDate ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                  ${selectedDate && isSameDay(date, selectedDate) ? 'bg-blue-100 border-blue-300' : ''}
                `}
              >
                <div className="text-sm font-medium">
                  {format(date, 'd')}
                </div>
                
                {/* 显示日历事件（公共假期等） */}
                {dayEvents.calendarEvents.slice(0, 2).map((event, index) => (
                  <div
                    key={index}
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getEventColor(event.type)}`}
                    title={event.title}
                  />
                ))}
                
                {/* 显示活动 */}
                {dayEvents.activities.slice(0, 1).map((activity, index) => (
                  <div
                    key={`activity-${index}`}
                    className="absolute top-1 left-1 w-2 h-2 rounded-full bg-purple-500"
                    title={activity.title}
                  />
                ))}
                
                {/* 显示空间预订 */}
                {dayEvents.bookings.slice(0, 1).map((booking, index) => (
                  <div
                    key={`booking-${index}`}
                    className="absolute top-4 left-1 w-2 h-2 rounded-full bg-green-500"
                    title={`预订: ${booking.spaceName}`}
                  />
                ))}
                
                {/* 显示跟进任务截止日期 */}
                {dayEvents.followUps.slice(0, 1).map((followUp, index) => (
                  <div
                    key={`followup-${index}`}
                    className="absolute top-7 left-1 w-2 h-2 rounded-full bg-orange-500"
                    title={`跟进任务: ${followUp.title} - ${followUp.customerName}`}
                  />
                ))}
                
                {/* 显示即将到期的跟进任务（前3-5天） */}
                {dayEvents.upcomingFollowUps.length > 0 && (
                  <div
                    className="absolute top-1 left-4 w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600"
                    title={`即将到期跟进任务: ${dayEvents.upcomingFollowUps.map(f => f.title).join(', ')}`}
                  />
                )}
                
                {/* 显示收入 */}
                {dayEvents.revenue > 0 && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-xs text-green-600 font-medium truncate">
                      RM{dayEvents.revenue.toFixed(0)}
                    </div>
                  </div>
                )}
                
                {/* 显示事件数量 */}
                {(dayEvents.calendarEvents.length + dayEvents.activities.length + dayEvents.bookings.length + dayEvents.followUps.length + dayEvents.upcomingFollowUps.length) > 3 && (
                  <div className="absolute bottom-1 right-1">
                    <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-1">
                      +{(dayEvents.calendarEvents.length + dayEvents.activities.length + dayEvents.bookings.length + dayEvents.followUps.length + dayEvents.upcomingFollowUps.length) - 3}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 选中日期详情 */}
      {selectedDate && (() => {
        const selectedEvents = getEventForDate(selectedDate);
        return (
          <div className="border-t border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
            </h3>
            
            {/* 日历事件（公共假期等） */}
            {selectedEvents.calendarEvents.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">日历事件</h4>
                {selectedEvents.calendarEvents.map((event, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getEventColor(event.type)}`}></div>
                    <span className="text-sm text-gray-700">{event.title}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* 活动 */}
            {selectedEvents.activities.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">活动</h4>
                {selectedEvents.activities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-gray-700">{activity.title}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* 空间预订 */}
            {selectedEvents.bookings.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">空间预订</h4>
                {selectedEvents.bookings.map((booking, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">{booking.spaceName} - {booking.customerName}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* 跟进任务截止日期 */}
            {selectedEvents.followUps.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">跟进任务截止</h4>
                {selectedEvents.followUps.map((followUp, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{followUp.title}</span>
                      <div className="text-xs text-gray-500">
                        {followUp.customerName} - 
                        <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                          followUp.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          followUp.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          followUp.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {followUp.priority === 'urgent' ? '紧急' :
                           followUp.priority === 'high' ? '高' :
                           followUp.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 即将到期的跟进任务 */}
            {selectedEvents.upcomingFollowUps.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">即将到期跟进任务</h4>
                {selectedEvents.upcomingFollowUps.map((followUp, index) => {
                  const daysUntilDue = differenceInDays(new Date(followUp.dueDate), selectedDate);
                  return (
                    <div key={index} className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600"></div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">{followUp.title}</span>
                        <div className="text-xs text-gray-500">
                          {followUp.customerName} - 
                          <span className="ml-1 text-yellow-600 font-medium">
                            {daysUntilDue}天后到期
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* 统计信息 */}
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                当日收入: <span className="font-medium text-green-600">RM{selectedEvents.revenue.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-600">
                发票数量: <span className="font-medium">{selectedEvents.invoices.length}</span>
              </div>
              <div className="text-sm text-gray-600">
                活动数量: <span className="font-medium">{selectedEvents.activities.length}</span>
              </div>
              <div className="text-sm text-gray-600">
                预订数量: <span className="font-medium">{selectedEvents.bookings.length}</span>
              </div>
              <div className="text-sm text-gray-600">
                跟进任务: <span className="font-medium">{selectedEvents.followUps.length}</span>
              </div>
              {selectedEvents.upcomingFollowUps.length > 0 && (
                <div className="text-sm text-gray-600">
                  即将到期: <span className="font-medium text-yellow-600">{selectedEvents.upcomingFollowUps.length}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}