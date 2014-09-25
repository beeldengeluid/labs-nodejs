# !/usr/bin/python

import os, sys
print "Current directory is: %s" %os.getcwd()

# listing directories
print "The dir is: %s"%os.listdir(os.getcwd())

# renaming file "aa1.txt"
os.renames("aa1.txt","newdir/aanew.txt")

print "Successfully renamed."

# listing directories after renaming and moving "aa1.txt"
print "The dir is: %s" %os.listdir(os.getcwd())