package com.example.app.config;

import com.example.app.dto.ProductResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Configuration
public class ProductCacheConfig implements CachingConfigurer {
    private static final Logger log = LoggerFactory.getLogger(ProductCacheConfig.class);
    private final ConcurrentMap<Object, PendingEviction> pendingEvictions = new ConcurrentHashMap<>();

    private static final class PendingEviction {
        private final Cache cache;

        private PendingEviction(Cache cache) {
            this.cache = cache;
        }
    }

    public boolean canRead(Long id) {
        PendingEviction pending = pendingEvictions.get(id);
        if (pending == null) return true;
        try {
            pending.cache.evict(id);
            return pendingEvictions.remove(id, pending);
        } catch (RuntimeException error) {
            logFailure(error);
            return false;
        }
    }

    @Bean
    RedisCacheManager productCacheManager(RedisConnectionFactory connection, ObjectMapper mapper,
            @Value("${freshvend.product-cache.ttl:PT2M}") Duration ttl) {
        var serializer = new Jackson2JsonRedisSerializer<>(mapper, ProductResponse.class);
        var config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .prefixCacheNameWith("freshvend:catalog:")
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));
        return RedisCacheManager.builder(connection).withCacheConfiguration("products", config)
                .disableCreateOnMissingCache().build();
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException error, Cache cache, Object key) {
                logFailure(error);
            }

            @Override
            public void handleCachePutError(RuntimeException error, Cache cache, Object key, Object value) {
                logFailure(error);
            }

            @Override
            public void handleCacheEvictError(RuntimeException error, Cache cache, Object key) {
                pendingEvictions.put(key, new PendingEviction(cache));
                logFailure(error);
            }

            @Override
            public void handleCacheClearError(RuntimeException error, Cache cache) {
                logFailure(error);
            }
        };
    }

    private void logFailure(RuntimeException error) {
        log.warn("Product cache unavailable: {}", error.toString());
    }
}
