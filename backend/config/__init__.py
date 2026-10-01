"""
GreenGrid Django Configuration Package.
Enables PyMySQL as MySQLdb driver for cross-platform MySQL support.
"""
try:
    import pymysql

    pymysql.install_as_MySQLdb()
except ImportError:
    pass
