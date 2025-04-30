import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CompetitorPriceDto, CreateStockItemDto, DailyPriceIncreasePerProductItemDto, DailyPriceIncreasePerProductResponseDto, MarketPriceComparisonItemDto, MarketPriceComparisonResponseDto, ProductDashboardResponseDto, StockItem, UpdateStockItemDto, WeeklyPriceIncreaseItemDto, WeeklyPriceIncreasePerProductItemDto, WeeklyPriceIncreasePerProductResponseDto } from './stock.entity';
import { userInfo } from 'os';

@Injectable()
export class StockService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async create(dto: CreateStockItemDto, userId:string): Promise<StockItem> {
    // const { data, error } = await this.supabase
    //   .from('stock')
    //   .insert([{ ...item, user_id: userId }])
    //   .select()
    //   .single();
    const { data, error } = await this.supabase.rpc(
      'create_product_with_initial_batch', 
      {
        p_name: dto.name,
        // p_description: dto.description,
        p_price: dto.price,
        p_quantity: dto.quantity,
        p_product_type: dto.product_type,
        p_expired_date: dto.expired_date,
        p_user_id: userId
      }
    ).select()
    .single();

    if (error) {
      throw new Error(`Supabase error [${error.code}]: ${error.message}`);
    }
    return data;
  }

  async findAll(
    userId: string,
    startDate?: string,
    endDate?: string,
    sort: 'asc' | 'desc' = 'desc'
  ): Promise<StockItem[]> {
    let query = this.supabase
      .from('stock')
      .select('*')
      .eq('user_id', userId);  // Add user filter
  
    // Date filter
    if (startDate && endDate) {
      query = query.gte('created_at', startDate)
                   .lte('created_at', endDate);
    }
  
    // Sorting
    query = query.order('created_at', { ascending: sort === 'asc' });
  
    const { data, error } = await query;
    
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findOne(id: string, userId:string): Promise<StockItem> {
    const { data, error } = await this.supabase
      .from('stock')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // Critical security check
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Stock item not found. Details: ${error.message}`);
      }
      throw new Error(`Supabase error [${error.code}]: ${error.message}`);
    }
    return data;
  }

  async update(id: string, updateDto: UpdateStockItemDto, userId: string): Promise<StockItem> {
    const { data, error } = await this.supabase
      .from('stock')
      .update({ ...updateDto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId) // Critical security check
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Stock item not found. Details: ${error.message}`);
      }
      throw new Error(`Supabase error [${error.code}]: ${error.message}`);
    }
    return data;
  }

  async remove(id: string, userId:string): Promise<void> {
    const { error } = await this.supabase
      .from('stock')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Critical security check

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Stock item not found. Details: ${error.message}`);
      }
      throw new Error(`Supabase error [${error.code}]: ${error.message}`);
    }
  }
  async getMarketPriceComparison(userId: string): Promise<MarketPriceComparisonResponseDto> {
    // Step 1: Get the current user's product names.
    const { data: userProducts, error: userProductsError } = await this.supabase
      .from('stock')
      .select('name, price')
      .eq('user_id', userId);

    if (userProductsError) {
      throw new InternalServerErrorException(userProductsError.message);
    }

    const userProductMap: Record<string, number> = {};
    userProducts.forEach((item) => {
      if (!userProductMap[item.name]) {
        userProductMap[item.name] = item.price;
      }
    });

    const productNames = Array.from(new Set(userProducts.map(item => item.name)));

    if (productNames.length === 0) {
      return {
        message: 'No products found for market comparison',
        data: [],
      };
    }

    // Step 2: Query for products with matching names but from other users.
    const { data: competitorProducts, error: competitorError } = await this.supabase
      .from('stock')
      .select('name, price, user_id, profiles(username)')
      .in('name', productNames)
      .neq('user_id', userId) as { data: { name: string; price: number; user_id: string; profiles?: { username: string } }[] | null, error: any };

    if (competitorError) {
      throw new InternalServerErrorException(competitorError.message);
    }

    // Step 3: Group the results by product name.
    const groupedData: Record<string, CompetitorPriceDto[]> = {};
    // Initialize the group with empty arrays.
    for (const name of productNames) {
      groupedData[name] = [];
    }
    competitorProducts?.forEach((item) => {
      groupedData[item.name].push({
        user_id: item.user_id,
        price: item.price,
        username: item.profiles?.username || 'unknown',
      });
    });

    // Transform the grouped data into an array of DTOs.
    const result: MarketPriceComparisonItemDto[] = [];
    for (const name of productNames) {
      result.push({
        name,
        user_price: userProductMap[name],
        competitorPrices: groupedData[name],
      });
    }

    return {
      message: 'Market comparison retrieved successfully',
      data: result,
    };
  }

  async getWeeklyPriceIncreaseGroupedByProduct(userId: string): Promise<WeeklyPriceIncreasePerProductResponseDto> {
    // Calculate start (Monday) and end (Sunday) of the current week.
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // Sunday = 0, Monday = 1, etc.
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Query the price_history table for records in the current week for the user.
    const { data, error } = await this.supabase
      .from('price_history')
      .select('price, recorded_at, product')
      .eq('user_id', userId)
      .gte('recorded_at', startOfWeek.toISOString())
      .lte('recorded_at', endOfWeek.toISOString());

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Group the records by product and then by day.
    const groupedData: Record<string, Record<string, { open?: number; close?: number }>> = {};
    // Outer key: product, inner key: day name (e.g., "Monday")
    data.forEach((record: { price: number; recorded_at: string; product: string }) => {
      const date = new Date(record.recorded_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      // Initialize for product if needed.
      if (!groupedData[record.product]) {
        groupedData[record.product] = {};
      }
      if (!groupedData[record.product][dayName]) {
        groupedData[record.product][dayName] = { open: record.price, close: record.price };
      } else {
        // Assuming we are ordering by time, you could also compare timestamps.
        // For this example, we simply take the minimum as open and maximum as close.
        groupedData[record.product][dayName].open = Math.min(groupedData[record.product][dayName].open ?? record.price, record.price);
        groupedData[record.product][dayName].close = Math.max(groupedData[record.product][dayName].close ?? record.price, record.price);
      }
    });

    const result: WeeklyPriceIncreasePerProductItemDto[] = [];

    for (const product in groupedData) {
      const dailyIncreases: WeeklyPriceIncreaseItemDto[] = [];
      for (const day in groupedData[product]) {
        const { open, close } = groupedData[product][day];
        // Calculate the percentage change if open is available and not zero.
        if (open !== undefined && open !== 0) {
          const percentage = close !== undefined ? ((close - open) / open) * 100 : 0;
          dailyIncreases.push({ day, percentage });
        }
      }
      result.push({ product, dailyIncreases });
    }

    return {
      message: 'Weekly price increase per product retrieved successfully',
      data: result,
    };
  }

  /**
   * Returns the daily price increase grouped by product for the current day.
   * For each product, the percentage change is calculated based on the first and last record of today.
   */
  async getDailyPriceIncreaseGroupedByProduct(userId: string): Promise<DailyPriceIncreasePerProductResponseDto> {
    const currentDate = new Date();
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all price history records for today.
    const { data, error } = await this.supabase
      .from('price_history')
      .select('price, recorded_at, product')
      .eq('user_id', userId)
      .gte('recorded_at', startOfDay.toISOString())
      .lte('recorded_at', endOfDay.toISOString());

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Group records per product.
    const productData: Record<string, { records: { price: number; recorded_at: string }[] }> = {};

    data.forEach((record: { price: number; recorded_at: string; product: string }) => {
      if (!productData[record.product]) {
        productData[record.product] = { records: [] };
      }
      productData[record.product].records.push({ price: record.price, recorded_at: record.recorded_at });
    });

    // Calculate daily price increase per product.
    const results: DailyPriceIncreasePerProductItemDto[] = [];

    for (const product in productData) {
      // Sort records for this product by their timestamp.
      const records = productData[product].records.sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );
      if (!records.length) continue;
      const open = records[0].price;
      const close = records[records.length - 1].price;
      if (open !== 0) {
        const percentage = ((close - open) / open) * 100;
        results.push({ product, percentage });
      }
    }

    return {
      message: 'Daily price increase per product retrieved successfully',
      data: results,
    };
  }

  async getProductDashboard(userId: string, productId: string): Promise<ProductDashboardResponseDto> {
    // 1. First, get the product name from the product ID (no need to filter by userId)
    const { data: productData, error: productError } = await this.supabase
      .from('stock')
      .select('name, price, user_id')
      .eq('id', productId)
      .single();
  
    if (productError) {
      if (productError.code === 'PGRST116') {
        throw new NotFoundException(`Product not found with ID: ${productId}`);
      }
      throw new InternalServerErrorException(productError.message);
    }
  
    // Verify the user has access to the product
    const productOwner = productData.user_id;
    const productName = productData.name;
    const userPrice = productData.price;
    
    // 2. Market Price Comparison using the product name
    const marketComparison: MarketPriceComparisonItemDto = {
      name: productName,
      user_price: userPrice, 
      competitorPrices: [],
    };
  
    // Query competitor records from the stock table for the same product.
    const { data: competitorProducts, error: competitorError } = await this.supabase
      .from('stock')
      .select('price, user_id, profiles(username)')
      .eq('name', productName)
      .neq('user_id', userId);
  
    if (competitorError) {
      throw new InternalServerErrorException(competitorError.message);
    }
  
    competitorProducts?.forEach((item: any) => {
      marketComparison.competitorPrices.push({
        user_id: item.user_id,
        price: item.price,
        username: item.profiles?.username || 'unknown',
      });
    });
  
    // 3. Weekly Price Increase for the product (across all users), using chronological approach
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // Sunday=0, Monday=1, etc.
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
  
    // Query weekly records for this product (all users).
    const { data: weeklyData, error: weeklyError } = await this.supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('product', productName)
      .gte('recorded_at', startOfWeek.toISOString())
      .lte('recorded_at', endOfWeek.toISOString());
  
    if (weeklyError) {
      throw new InternalServerErrorException(weeklyError.message);
    }
  
    // First, group records by day
    const groupedByDay: Record<string, Array<{price: number, recorded_at: string}>> = {};
    weeklyData.forEach((record: { price: number; recorded_at: string }) => {
      const date = new Date(record.recorded_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (!groupedByDay[dayName]) {
        groupedByDay[dayName] = [];
      }
      
      groupedByDay[dayName].push(record);
    });
  
    // Then find the first and last price for each day (chronologically)
    const weeklyDailyIncreases: { day: string; percentage: number }[] = [];
  
    Object.entries(groupedByDay).forEach(([day, records]) => {
      if (records.length === 0) return;
      
      // Sort records by timestamp
      records.sort((a, b) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );
      
      const open = records[0].price;
      const close = records[records.length - 1].price;
      
      if (open !== 0) {
        const percentage = ((close - open) / open) * 100;
        weeklyDailyIncreases.push({ day, percentage });
      }
    });
  
    // 4. Daily Price Increase for the product (across all users).
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
  
    const { data: dailyData, error: dailyError } = await this.supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('product', productName)
      .gte('recorded_at', startOfDay.toISOString())
      .lte('recorded_at', endOfDay.toISOString());
  
    if (dailyError) {
      throw new InternalServerErrorException(dailyError.message);
    }
  
    // Sort the daily records to determine the open and latest prices.
    dailyData.sort((a: { recorded_at: string }, b: { recorded_at: string }) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    let dailyPercentage: number | null = null;
    if (dailyData.length > 0) {
      const open = dailyData[0].price;
      const close = dailyData[dailyData.length - 1].price;
      if (open !== 0) {
        dailyPercentage = ((close - open) / open) * 100;
      }
    }
  
    const dashboardData = {
      marketComparison,
      weeklyIncrease: { dailyIncreases: weeklyDailyIncreases },
      dailyIncrease: { percentage: dailyPercentage },
    };
  
    return {
      message: 'Product dashboard retrieved successfully',
      data: dashboardData,
    };
  }
  
  
}