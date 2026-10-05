process.env.DB_PATH      = ':memory:';
process.env.NODE_ENV     = 'test';
process.env.JWT_SECRET   = 'test_jwt_secret_for_jest_only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT         = '3001';
